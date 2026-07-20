import { getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { baseURI, refreshToken } from "./WebClient";
import { fetchWithTimeout } from "./HttpClient";
import { mockProjects, mockTasks, mockTypeOfWork } from "./MockData";

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

export interface task {
  id: string;
  name: string;
  projectId: string;
  project: project;
  typeOfWorkId?: string;
  taskIdentifier?: string;
  taskStatus: taskStatus;
}

export interface typeOfWork {
  id: string;
  name: string;
}

const useMockData = false;

const preferences = getPreferenceValues<Preferences>();
const MAX_REQUEST_RETRIES = 1;

type RequestError = Error & { status?: number };

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

    const loadProjects = async (retryCount = 0): Promise<{ data: project[]; hasMore: boolean }> =>
      fetchWithTimeout(
        new URL(
          `${baseURI}/projects?page=${options.page + 1}&pageSize=${pageSize}&orderby=updatedOn desc${filterBy ? "&filterby=" + filterBy : ""}`,
        ),
        getRequestOptions(token),
      )
        .then(async (response) => {
          if (!response.ok) {
            if (response.status === 401) {
              const bodyText = await response.text();
              if (bodyText.match(/token expired/i)) {
                const newTokens = await refreshToken();
                if (newTokens) {
                  return getProjects(newTokens.accessToken, searchText, pageSize)(options);
                }
              }
            }
            const error: RequestError = new Error(`HTTP error! status: ${response.status}`);
            error.name = "FetchError";
            error.status = response.status;
            throw error;
          }

          const data = await response.text();
          if (data.match(/token expired/i)) {
            const newTokens = await refreshToken();
            if (newTokens) {
              return getProjects(newTokens.accessToken, searchText, pageSize)(options);
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
            return loadProjects(retryCount + 1);
          }

          showFailureToast(e, {
            title: e.name === "FetchError" || e.name === "TimeoutError" ? "Couldn´t load Projects" : e.name,
            message: `${e.name}: ${e.message}`,
          });
          console.error(e);
          return { data: [] as project[], hasMore: false };
        });

    return loadProjects();
  };

export const getTasks =
  (token: string, searchText: string, pageSize: number, projectId?: string) =>
  async (options: { page: number }): Promise<{ data: task[]; hasMore: boolean }> => {
    if (useMockData) {
      return { data: mockTasks, hasMore: false };
    }
    const route = projectId ? `projects/${projectId}/projecttasks` : "me/projecttasks";
    const pagination = `page=${options.page + 1}&pageSize=${pageSize}`;
    let filterBy = preferences.showDoneTasks ? "" : "taskstatus/type ne 'done'";

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

    const loadTasks = async (retryCount = 0): Promise<{ data: task[]; hasMore: boolean }> =>
      fetchWithTimeout(
        new URL(`${baseURI}/${route}?${pagination}${filterBy ? `&filterby=${filterBy}` : ""}`),
        getRequestOptions(token),
      )
        .then(async (response) => {
          if (!response.ok) {
            if (response.status === 401) {
              const bodyText = await response.text();
              if (bodyText.match(/token expired/i)) {
                const newTokens = await refreshToken();
                if (newTokens) {
                  return getTasks(newTokens.accessToken, searchText, pageSize, projectId)(options);
                }
              }
            }
            const error: RequestError = new Error(`HTTP error! status: ${response.status}`);
            error.name = "FetchError";
            error.status = response.status;
            throw error;
          }

          const data = await response.text();
          if (data.match(/token expired/i)) {
            const newTokens = await refreshToken();
            if (newTokens) {
              return getTasks(newTokens.accessToken, searchText, pageSize, projectId)(options);
            }
            return { data: [], hasMore: false };
          }

          return {
            data: (JSON.parse(data) as task[]).map(normalizeTask),
            hasMore: Number(response.headers.get("aw-totalitems")) > pageSize * (options.page + 1),
          };
        })
        .catch(async (e: RequestError) => {
          if (retryCount < MAX_REQUEST_RETRIES && isRetryableRequestError(e)) {
            await delayBeforeRetry(e);
            return loadTasks(retryCount + 1);
          }

          showFailureToast(e, {
            title: e.name === "FetchError" || e.name === "TimeoutError" ? "Couldn´t load Tasks" : e.name,
            message: `${e.name}: ${e.message}`,
          });
          console.error(e);
          return { data: [], hasMore: false };
        });

    return loadTasks();
  };

export const getTypesOfWork = async (token: string): Promise<string | typeOfWork[]> => {
  if (useMockData) {
    return mockTypeOfWork;
  }
  const loadTypesOfWork = async (retryCount = 0): Promise<string | typeOfWork[]> =>
    fetchWithTimeout(`${baseURI}/typeofwork?OrderBy=name`, getRequestOptions(token))
      .then(async (response) => {
        if (!response.ok) {
          if (response.status === 401) {
            const bodyText = await response.text();
            if (bodyText.match(/token expired/i)) {
              const newTokens = await refreshToken();
              if (newTokens) {
                return getTypesOfWork(newTokens.accessToken);
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
        if (result.match(/token expired/i)) {
          const newTokens = await refreshToken();
          if (newTokens) {
            return getTypesOfWork(newTokens.accessToken);
          }
          return "Invalid Token";
        }
        return <Array<typeOfWork>>JSON.parse(result);
      })
      .catch(async (e: RequestError) => {
        if (retryCount < MAX_REQUEST_RETRIES && isRetryableRequestError(e)) {
          await delayBeforeRetry(e);
          return loadTypesOfWork(retryCount + 1);
        }

        showFailureToast(e, {
          title: e.name === "FetchError" || e.name === "TimeoutError" ? "Couldn´t load Types of work" : e.name,
          message: `${e.name}: ${e.message}`,
        });
        console.error(e);
        return "error";
      });

  return loadTypesOfWork();
};
