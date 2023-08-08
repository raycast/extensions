import { graphql } from "@octokit/graphql";
import { Octokit } from "octokit";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "./preferences";

const { token } = getPreferenceValues<Preferences>();

const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `token ${token}`,
  },
});

export const octokit = new Octokit({ auth: token });

export const graphqlClient = graphqlWithAuth;

export const recentProjectsQuery = `
query recentProjects($login: String!) {
  organization(login: $login) {
    recentProjects(first: 20) {
      nodes {
        id
        title
        url
        public
        shortDescription
        updatedAt
        items {
          totalCount
        }
        views(first:50, orderBy: { field: POSITION, direction: ASC }){
          totalCount
          nodes {
            id
            name
            number
            layout
          }
        }
      }
    }
  }
}
`;

export interface Project {
  id: string;
  title: string;
  url: string;
  public: boolean;
  shortDescription: string;
  updatedAt: string;
  items: {
    totalCount: number;
  };
  views: {
    totalCount: number;
    nodes: Array<View>;
  };
}

export interface View {
  id: string;
  name: string;
  number: number;
  layout: string;
}

export interface RecentProjectsQuery {
  organization: {
    recentProjects: {
      nodes: Array<Project>;
    };
  };
}
