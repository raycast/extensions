import { getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { baseURI, refreshToken } from "./WebClient";
import { fetchWithTimeout } from "./HttpClient";
import {
  mockPrivateTaskStatuses,
  mockProjectMembers,
  mockProjects,
  mockTaskLists,
  mockTasks,
  mockTaskStatuses,
  mockTypeOfWork,
} from "./MockData";

interface company {
  id: string;
  name: string;
}

interface projectStatus {
  type: string;
}

export interface project {
  id: string;
  name: string;
  isBillableByDefault: boolean;
  projectKey?: string;
  company?: company;
  projectStatus: projectStatus;
}

interface taskStatus {
  type: string;
  icon: string;
}

export interface TaskStatus {
  id: string;
  name: string;
  type: string;
  order?: number;
}

export interface TaskList {
  id: string;
  name: string;
  order?: number;
  isArchived: boolean;
}

export interface ProjectMember {
  id: string;
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  isDeactivated: boolean;
  isExternal: boolean;
}

export interface task {
  id: string;
  name: string;
  projectId: string;
  project: project;
  typeOfWorkId?: string;
  taskIdentifier?: string;
  taskStatus: taskStatus;
  parentId?: string;
}

export interface typeOfWork {
  id: string;
  name: string;
}

const useMockData = false;

const preferences = getPreferenceValues<Preferences>();
const MAX_REQUEST_RETRIES = 1;

type RequestError = Error & { status?: number };

export interface ReferenceDataOptions {
  throwOnError?: boolean;
}

export interface TaskRequestOptions {
  includeDone?: boolean;
  throwOnError?: boolean;
}

interface ReferenceDataRequestOptions extends ReferenceDataOptions {
  permissionDeniedMessage?: string;
}

const getRequestOptions = (token: string) => ({
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`,
  },
  redirect: "follow" as const,
});

const isRetryableRequestError = (error: RequestError) =>
  error.name === "TimeoutError" ||
  error.name === "AbortError" ||
  (error.name === "FetchError" && (!error.status || error.status === 429 || error.status >= 500));

const delayBeforeRetry = (error: RequestError) =>
  error.status === 429 ? new Promise((resolve) => setTimeout(resolve, 1000)) : Promise.resolve();

const getReferenceData = async <T>(
  token: string,
  url: string,
  errorTitle: string,
  options: ReferenceDataRequestOptions = {},
): Promise<T[]> => {
  const loadData = async (currentToken: string, retryCount = 0, hasRefreshed = false): Promise<T[]> => {
    try {
      const response = await fetchWithTimeout(url, getRequestOptions(currentToken));
      if (response.status === 401 && !hasRefreshed) {
        const newTokens = await refreshToken();
        if (newTokens) {
          return loadData(newTokens.accessToken, retryCount, true);
        }
      }
      if (!response.ok) {
        const error: RequestError = new Error(`HTTP error! status: ${response.status}`);
        error.name = "FetchError";
        error.status = response.status;
        throw error;
      }

      return (await response.json()) as T[];
    } catch (error) {
      const requestError = error as RequestError;
      if (retryCount < MAX_REQUEST_RETRIES && isRetryableRequestError(requestError)) {
        await delayBeforeRetry(requestError);
        return loadData(currentToken, retryCount + 1, hasRefreshed);
      }

      if (options.throwOnError) {
        const surfacedError: RequestError = new Error(
          requestError.status === 403 && options.permissionDeniedMessage
            ? options.permissionDeniedMessage
            : `${errorTitle}: ${requestError.message}`,
        );
        surfacedError.name = requestError.name;
        surfacedError.status = requestError.status;
        throw surfacedError;
      }

      showFailureToast(requestError, {
        title:
          requestError.name === "FetchError" || requestError.name === "TimeoutError" ? errorTitle : requestError.name,
        message: `${requestError.name}: ${requestError.message}`,
      });
      console.error(requestError);
      return [];
    }
  };

  return loadData(token);
};

const normalizeProject = (project: project): project => ({
  id: project.id,
  name: project.name,
  isBillableByDefault: project.isBillableByDefault,
  projectKey: project.projectKey,
  company: project.company ? { id: project.company.id, name: project.company.name } : undefined,
  projectStatus: {
    type: project.projectStatus?.type ?? "",
  },
});

const normalizeTask = (task: task): task => ({
  id: task.id,
  name: task.name,
  projectId: task.projectId,
  project: task.project
    ? normalizeProject(task.project)
    : {
        id: task.projectId,
        name: "",
        isBillableByDefault: false,
        projectStatus: { type: "" },
      },
  typeOfWorkId: task.typeOfWorkId,
  taskIdentifier: task.taskIdentifier,
  taskStatus: {
    type: task.taskStatus?.type ?? "",
    icon: task.taskStatus?.icon ?? "",
  },
  parentId: task.parentId,
});

export const getProjects =
  (token: string, searchText: string, pageSize: number) =>
  async (options: {
    page: number;
  }): Promise<{
    data: project[];
    hasMore: boolean;
  }> => {
    if (useMockData) {
      return { data: mockProjects, hasMore: false };
    }
    let filterBy = preferences.showDoneProjects ? "" : "projectStatus/type ne 'closed'";
    if (searchText !== "") {
      const searchTextIsUuid = searchText.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      if (filterBy) {
        filterBy = filterBy + " and ";
      }

      if (searchTextIsUuid) {
        filterBy = filterBy + `id eq guid'${encodeURIComponent(searchText)}'`;
      } else {
        const encodedSearchText = encodeURIComponent(searchText.replaceAll("'", ""));
        filterBy = filterBy + `(substringof('${encodedSearchText}',name) or projectKey eq '${encodedSearchText}')`;
      }
    }

    const loadProjects = async (
      activeToken: string,
      retryCount = 0,
      hasRefreshedToken = false,
    ): Promise<{ data: project[]; hasMore: boolean }> =>
      fetchWithTimeout(
        new URL(
          `${baseURI}/projects?page=${options.page + 1}&pageSize=${pageSize}&orderby=updatedOn desc${filterBy ? "&filterby=" + filterBy : ""}`,
        ),
        getRequestOptions(activeToken),
      )
        .then(async (response) => {
          if (!response.ok) {
            if (response.status === 401 && !hasRefreshedToken) {
              const bodyText = await response.text();
              if (bodyText.match(/token expired/i)) {
                const newTokens = await refreshToken();
                if (newTokens) {
                  return loadProjects(newTokens.accessToken, retryCount, true);
                }
              }
            }
            const error: RequestError = new Error(`HTTP error! status: ${response.status}`);
            error.name = "FetchError";
            error.status = response.status;
            throw error;
          }

          const data = await response.text();
          if (!hasRefreshedToken && data.match(/token expired/i)) {
            const newTokens = await refreshToken();
            if (newTokens) {
              return loadProjects(newTokens.accessToken, retryCount, true);
            }
            return { data: [], hasMore: false };
          }

          return {
            data: (JSON.parse(data) as project[]).map(normalizeProject),
            hasMore: Number(response.headers.get("aw-totalitems")) > pageSize * (options.page + 1),
          };
        })
        .catch(async (e: RequestError) => {
          if (retryCount < MAX_REQUEST_RETRIES && isRetryableRequestError(e)) {
            await delayBeforeRetry(e);
            return loadProjects(activeToken, retryCount + 1, hasRefreshedToken);
          }

          showFailureToast(e, {
            title: e.name === "FetchError" || e.name === "TimeoutError" ? "Couldn't load Projects" : e.name,
            message: `${e.name}: ${e.message}`,
          });
          console.error(e);
          return { data: [] as project[], hasMore: false };
        });

    return loadProjects(token);
  };

export const getTasks =
  (token: string, searchText: string, pageSize: number, projectId?: string, requestOptions: TaskRequestOptions = {}) =>
  async (paginationOptions: { page: number }): Promise<{ data: task[]; hasMore: boolean }> => {
    if (useMockData) {
      return { data: mockTasks, hasMore: false };
    }
    const route = projectId ? `projects/${projectId}/projecttasks` : "me/projecttasks";
    const pagination = `page=${paginationOptions.page + 1}&pageSize=${pageSize}`;
    let filterBy = preferences.showDoneTasks || requestOptions.includeDone ? "" : "taskstatus/type ne 'done'";

    if (searchText) {
      const searchTextIsUuid = searchText.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      if (filterBy) {
        filterBy = `${filterBy} and `;
      }

      if (searchTextIsUuid) {
        filterBy = `${filterBy}id eq guid'${encodeURIComponent(searchText)}'`;
      } else {
        const encodedSearchText = encodeURIComponent(searchText.replaceAll("'", ""));
        filterBy = `${filterBy}(substringof('${encodedSearchText}',name) or substringof('${encodedSearchText}',project/name) or substringof('${encodedSearchText}', taskIdentifier))`;
      }
    }

    const loadTasks = async (
      activeToken: string,
      retryCount = 0,
      hasRefreshedToken = false,
    ): Promise<{ data: task[]; hasMore: boolean }> =>
      fetchWithTimeout(
        new URL(`${baseURI}/${route}?${pagination}${filterBy ? `&filterby=${filterBy}` : ""}`),
        getRequestOptions(activeToken),
      )
        .then(async (response) => {
          if (!response.ok) {
            if (response.status === 401 && !hasRefreshedToken) {
              const bodyText = await response.text();
              if (bodyText.match(/token expired/i)) {
                const newTokens = await refreshToken();
                if (newTokens) {
                  return loadTasks(newTokens.accessToken, retryCount, true);
                }
              }
            }
            const error: RequestError = new Error(`HTTP error! status: ${response.status}`);
            error.name = "FetchError";
            error.status = response.status;
            throw error;
          }

          const data = await response.text();
          if (!hasRefreshedToken && data.match(/token expired/i)) {
            const newTokens = await refreshToken();
            if (newTokens) {
              return loadTasks(newTokens.accessToken, retryCount, true);
            }
            return { data: [], hasMore: false };
          }

          return {
            data: (JSON.parse(data) as task[]).map(normalizeTask),
            hasMore: Number(response.headers.get("aw-totalitems")) > pageSize * (paginationOptions.page + 1),
          };
        })
        .catch(async (e: RequestError) => {
          if (retryCount < MAX_REQUEST_RETRIES && isRetryableRequestError(e)) {
            await delayBeforeRetry(e);
            return loadTasks(activeToken, retryCount + 1, hasRefreshedToken);
          }

          if (requestOptions.throwOnError) throw e;

          showFailureToast(e, {
            title: e.name === "FetchError" || e.name === "TimeoutError" ? "Couldn't load Tasks" : e.name,
            message: `${e.name}: ${e.message}`,
          });
          console.error(e);
          return { data: [], hasMore: false };
        });

    return loadTasks(token);
  };

export const getTypesOfWork = async (token: string): Promise<string | typeOfWork[]> => {
  if (useMockData) {
    return mockTypeOfWork;
  }
  const loadTypesOfWork = async (
    activeToken: string,
    retryCount = 0,
    hasRefreshedToken = false,
  ): Promise<string | typeOfWork[]> =>
    fetchWithTimeout(`${baseURI}/typeofwork?OrderBy=name`, getRequestOptions(activeToken))
      .then(async (response) => {
        if (!response.ok) {
          if (response.status === 401 && !hasRefreshedToken) {
            const bodyText = await response.text();
            if (bodyText.match(/token expired/i)) {
              const newTokens = await refreshToken();
              if (newTokens) {
                return loadTypesOfWork(newTokens.accessToken, retryCount, true);
              }
              return "Invalid Token";
            }
          }
          const error: RequestError = new Error(`HTTP error! status: ${response.status}`);
          error.name = "FetchError";
          error.status = response.status;
          throw error;
        }

        const result = await response.text();
        if (!hasRefreshedToken && result.match(/token expired/i)) {
          const newTokens = await refreshToken();
          if (newTokens) {
            return loadTypesOfWork(newTokens.accessToken, retryCount, true);
          }
          return "Invalid Token";
        }
        return <Array<typeOfWork>>JSON.parse(result);
      })
      .catch(async (e: RequestError) => {
        if (retryCount < MAX_REQUEST_RETRIES && isRetryableRequestError(e)) {
          await delayBeforeRetry(e);
          return loadTypesOfWork(activeToken, retryCount + 1, hasRefreshedToken);
        }

        showFailureToast(e, {
          title: e.name === "FetchError" || e.name === "TimeoutError" ? "Couldn't load Types of work" : e.name,
          message: `${e.name}: ${e.message}`,
        });
        console.error(e);
        return "error";
      });

  return loadTypesOfWork(token);
};

export const getTaskStatuses = async (
  token: string,
  projectId: string,
  options: ReferenceDataOptions = {},
): Promise<TaskStatus[]> => {
  if (useMockData) {
    return mockTaskStatuses;
  }

  if (!projectId || projectId === "none") return [];

  const statuses = await getReferenceData<TaskStatus>(
    token,
    `${baseURI}/projects/${projectId}/taskstatuses`,
    "Couldn´t load task statuses",
    options,
  );
  return statuses.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
};

export const getPrivateTaskStatuses = async (
  token: string,
  options: ReferenceDataOptions = {},
): Promise<TaskStatus[]> => {
  if (useMockData) {
    return mockPrivateTaskStatuses;
  }

  const statuses = await getReferenceData<TaskStatus>(
    token,
    `${baseURI}/me/privatetasks/taskstatuses?pageSize=1000&orderby=order asc`,
    "Couldn´t load private task statuses",
    options,
  );
  return statuses.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
};

export const getTaskLists = async (
  token: string,
  projectId: string,
  options: ReferenceDataOptions = {},
): Promise<TaskList[]> => {
  if (useMockData) {
    return mockTaskLists;
  }

  if (!projectId || projectId === "none") return [];

  const taskLists = await getReferenceData<TaskList>(
    token,
    `${baseURI}/projects/${projectId}/tasklists?pageSize=1000&orderby=order asc`,
    "Couldn´t load task lists",
    {
      ...options,
      permissionDeniedMessage:
        "You don't have permission to read task lists for this project. awork requires project-planning-data:read.",
    },
  );
  return taskLists.filter((taskList) => !taskList.isArchived);
};

export const getProjectMembers = async (
  token: string,
  projectId: string,
  options: ReferenceDataOptions = {},
): Promise<ProjectMember[]> => {
  if (useMockData) {
    return mockProjectMembers;
  }

  if (!projectId || projectId === "none") return [];

  const members = await getReferenceData<ProjectMember>(
    token,
    `${baseURI}/projects/${projectId}/members?pageSize=1000`,
    "Couldn´t load project members",
    {
      ...options,
      permissionDeniedMessage:
        "You don't have permission to read members for this project. awork requires project-master-data:read or project ownership.",
    },
  );
  return members
    .filter((member) => !member.isDeactivated)
    .sort((a, b) =>
      `${a.firstName ?? ""} ${a.lastName ?? ""}`.localeCompare(`${b.firstName ?? ""} ${b.lastName ?? ""}`),
    );
};
