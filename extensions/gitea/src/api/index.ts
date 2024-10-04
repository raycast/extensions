import { useFetch } from "@raycast/utils";
import { getPreferenceValues } from "@raycast/api";
import {
  issue,
  Issue,
  label,
  Label,
  Milestone,
  milestone,
  organization,
  Organization,
  Package,
  registryPackage,
  repository,
  Repository,
  User,
  user,
} from "../zod";
import axios from "axios";

const preferences = getPreferenceValues();
const token = preferences.token;
const url = preferences.url;

const headers = {
  Authorization: `Bearer ${token}`,
};

export function useOrganizations() {
  return useFetch<Organization[]>(`${url}/api/v1/orgs?${new URLSearchParams({ limit: "1000" })}`, {
    mapResult(result) {
      return {
        data: organization.array().parse(result),
        hasMore: false,
      };
    },
    headers,
  });
}

export type UseSearchInput = {
  state: "closed" | "open" | "all";
  type: "issues" | "pulls";
  owner: string;
  assigned?: boolean;
  reviewRequested?: boolean;
};
export function useSearchIssues({ state, owner, type, assigned = false, reviewRequested = false }: UseSearchInput) {
  return useFetch<Issue[]>(
    `${url}/api/v1/repos/issues/search?${new URLSearchParams({ state, owner, type, assigned: assigned ? "true" : "false", review_requested: reviewRequested ? "true" : "false", limit: "1000" })}`,
    {
      mapResult(result) {
        return {
          data: issue.array().parse(result),
          hasMore: false,
        };
      },
      headers,
    },
  );
}

export function useAssignees(repo: string) {
  return useFetch<User[]>(`${url}/api/v1/repos/${repo}/assignees`, {
    mapResult(result) {
      return {
        data: user.array().parse(result),
        hasMore: false,
      };
    },
    headers,
  });
}

export function useLabels(repo: string) {
  return useFetch<Label[]>(`${url}/api/v1/repos/${repo}/labels`, {
    mapResult(result) {
      return {
        data: label.array().parse(result),
        hasMore: false,
      };
    },
    headers,
  });
}

export function useMilestones(repo: string) {
  return useFetch<Milestone[]>(`${url}/api/v1/repos/${repo}/milestones`, {
    mapResult(result) {
      return {
        data: milestone.array().parse(result),
        hasMore: false,
      };
    },
    headers,
  });
}

export function useSearchRepositories() {
  return useFetch<{ data: Repository[] }>(`${url}/api/v1/repos/search?${new URLSearchParams({ limit: "1000" })}`, {
    mapResult(result) {
      return {
        data: { data: repository.array().parse(result.data) },
        hasMore: false,
      };
    },
    headers,
  });
}

export function useSearchPackages({ owner }: { owner: string }) {
  return useFetch<Package[]>(`${url}/api/v1/packages/${owner}?${new URLSearchParams({ limit: "1000" })}`, {
    mapResult(result) {
      return {
        data: registryPackage.array().parse(result),
        hasMore: false,
      };
    },
    headers,
  });
}

export type CreateIssueInput = {
  title: string;
  assignees: string[];
  body: string;
  repo: string;
  milestone: string;
  due_date: Date | null;
  labels: string[];
};

export function useCreateIssue({ repo, ...rest }: CreateIssueInput) {
  return axios.post(
    `${url}/api/v1/repos/${repo}/issues`,
    {
      ...rest,
      labels: rest.labels.map((label) => parseInt(label)),
    },
    {
      headers,
    },
  );
}
