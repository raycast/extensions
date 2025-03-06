import { QueryParams, request } from "./client";

export interface SearchResults<T> {
  size: number;
  searchResults: T;
}

export interface PlansItem {
  id: string;
  type: string;
  searchEntity: {
    id: string;
    key: string;
    projectName: string;
    planName: string;
    branchName: string;
    description: string;
    type: string;
  };
}

export interface DeploymentsItem {
  id: string;
  type: string;
  searchEntity: {
    id: string;
    key: string;
    projectName: string;
    description: string;
  };
}

export interface ProjectsItem {
  id: string;
  type: string;
  searchEntity: {
    id: string;
    key: string;
    projectName: string;
    description: string;
  };
}

export const plans = (query: QueryParams = {}) => {
  return request<SearchResults<PlansItem[]>>("/search/plans", {
    method: "GET",
    query,
  });
};

export const deployments = (query: QueryParams = {}) => {
  return request<SearchResults<DeploymentsItem[]>>("/search/deployments", {
    method: "GET",
    query,
  });
};

export const projects = (query: QueryParams = {}) => {
  return request<SearchResults<ProjectsItem[]>>("/search/projects", {
    method: "GET",
    query,
  });
};
