import { checkStatusCode, graphQlEndpoint, headers } from "./common";
import fetch from "node-fetch";

export interface Project {
  id: string;
  name: string;
  fullPath: string;
  defaultBranch: string;
}

type ProjectApi = Project & {
  repository: {
    rootRef: string;
  };
};

const LIST_MY_PROJECTS_QUERY = `
query ListMyProjects {
    projects(membership: true) {
        nodes {
            id
            name
            fullPath
            repository {
                rootRef
            }
        }
    }
}
`;

export function myProjects(): Promise<Project[]> {
  return fetch(graphQlEndpoint, {
    headers,
    method: "post",
    body: JSON.stringify({
      query: LIST_MY_PROJECTS_QUERY,
    }),
  })
    .then(checkStatusCode)
    .then((res) => res.json())
    .then((data) => {
      const projects = data.data.projects.nodes;
      return convertToProjects(projects);
    });
}

export function convertToProjects(projectsResponse: ProjectApi[]) {
  return projectsResponse.map((proj) => ({
    ...proj,
    defaultBranch: proj.repository.rootRef,
  }));
}
