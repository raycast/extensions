import { getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import fetch from "node-fetch";
import { baseURI, refreshToken } from "./WebClient";

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
  taskStatus: taskStatus;
}

export interface typeOfWork {
  id: string;
  name: string;
}

const preferences = getPreferenceValues<Preferences>();

const getRequestOptions = (token: string) => ({
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`,
  },
  redirect: "follow" as const,
});

export const getProjects =
  (token: string, searchText: string, pageSize: number) => async (options: { page: number }) => {
    let filterBy = preferences.showDoneProjects ? "" : "projectStatus/type ne 'closed'";
    if (searchText !== "") {
      if (filterBy) {
        filterBy = filterBy + " and ";
      }
      filterBy = filterBy + `substringof('${encodeURIComponent(searchText.replaceAll("'", ""))}',name)`;
    }

    return fetch(
      new URL(
        `${baseURI}/projects?page=${options.page + 1}&pageSize=${pageSize}&orderby=updatedOn desc${filterBy ? "&filterby=" + filterBy : ""}`,
      ),
      getRequestOptions(token),
    )
      .then((response) => {
        if (!response.ok) {
          const error = new Error(`HTTP error! status: ${response.status}`);
          error.name = "FetchError";
          throw error;
        }
        return { body: response.text(), headers: response.headers };
      })
      .then(async (result) => {
        const data = await result.body;
        if (data.match(/token expired/i)) {
          await refreshToken();
          return { data: [], hasMore: false };
        }
        return {
          data: <Array<project>>JSON.parse(data),
          hasMore: Number(result.headers.get("aw-totalitems")) > pageSize * (options.page + 1),
        };
      })
      .catch((e: Error) => {
        showFailureToast(e, {
          title: e.name === "FetchError" ? "Couldn´t load Projects" : e.name,
          message: e.name === "FetchError" ? e.name + ": " + e.message : e.message,
        });
        console.error(e);
        return { data: [] as project[], hasMore: false };
      });
  };

export const getTasks =
  (token: string, searchText: string, pageSize: number, projectId?: string) => async (options: { page: number }) => {
    const route = projectId ? `projects/${projectId}/projecttasks` : "me/projecttasks";
    const pagination = `page=${options.page + 1}&pageSize=${pageSize}`;
    let filterBy = preferences.showDoneTasks ? "filterby=" : "filterby=taskstatus/type ne 'done'";

    if (searchText) {
      const searchTextIsUuid = searchText.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      if (searchTextIsUuid) {
        filterBy = `${filterBy} and id eq guid'${encodeURIComponent(searchText)}'`;
      } else {
        filterBy = `${filterBy} and (substringof('${encodeURIComponent(searchText.replaceAll("'", ""))}',name) or substringof('${encodeURIComponent(searchText.replaceAll("'", ""))}',project/name))`;
      }
    }

    return fetch(new URL(`${baseURI}/${route}?${pagination}&${filterBy}`), getRequestOptions(token))
      .then((response) => ({
        body: response.text(),
        headers: response.headers,
      }))
      .then(async (result) => {
        const data = await result.body;
        if (data.match(/token expired/i)) {
          await refreshToken();
          return { data: [], hasMore: false };
        }
        return {
          data: <Array<task>>JSON.parse(data),
          hasMore: Number(result.headers.get("aw-totalitems")) > pageSize * (options.page + 1),
        };
      })
      .catch((e: Error) => {
        showFailureToast(e, {
          title: e.name === "FetchError" ? "Couldn´t load Tasks" : e.name,
          message: e.name === "FetchError" ? e.name + ": " + e.message : e.message,
        });
        console.error(e);
        return { data: [], hasMore: false };
      });
  };

export const getTypesOfWork = async (token: string) => {
  return fetch(`${baseURI}/typeofwork?OrderBy=name`, getRequestOptions(token))
    .then((response) => response.text())
    .then(async (result) => {
      if (result.match(/token expired/)) {
        await refreshToken();
        return "Invalid Token";
      }
      return <Array<typeOfWork>>JSON.parse(result);
    })
    .catch((e: Error) => {
      showFailureToast({
        title: e.name === "FetchError" ? "Couldn´t load Types of work" : e.name,
        message: e.name === "FetchError" ? e.name + ": " + e.message : e.message,
      });
      console.error(e);
      return "error";
    });
};
