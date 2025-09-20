import { showFailureToast, useFetch } from "@raycast/utils";
import type { ListModrinthProject } from "./use-modrinth-search";
import { BASE_URL } from "../utils/constants";

type DonationUrl = {
  id: string;
  platform: string;
  url: string;
};

type ProjectLicense = {
  id: string;
  name: string;
  url: string;
};

export type ModrinthProject = Omit<ListModrinthProject, "follows"> & {
  source_url?: string;
  issues_url?: string;
  wiki_url?: string;
  discord_url?: string;
  donation_urls?: DonationUrl[];
  body: string;
  published: string;
  updated: string;
  approved: string;
  followers: number;
  license?: ProjectLicense;
};

type Props = {
  projectId: string;
  isSelected: boolean;
};

type UseModrinthProjectReturn = {
  project: ModrinthProject | undefined;
  isLoading: boolean;
};

/**
 * A hook that contains all logic for fetching and mapping a modrinth project by its slug, only executing if it's selected.
 */
export const useModrinthProject = ({ projectId, isSelected }: Props): UseModrinthProjectReturn => {
  const { data, isLoading, error } = useFetch(`${BASE_URL}/project/${projectId}`, {
    headers: {
      "Content-Type": "application/json",
    },
    execute: isSelected,
    cache: "default",
    mapResult: (result) => {
      if (isModrinthProject(result)) {
        return {
          data: result,
        };
      }

      return { data: undefined };
    },
    onError: (error) => {
      console.error(error);
    },
    initialData: undefined,
  });

  if (!isLoading && error) {
    showFailureToast(error.message);
  }

  if (isSelected && !isLoading && !data) {
    showFailureToast(`Failed to fetch project ${projectId}`);
  }

  return {
    isLoading,
    project: data,
  };
};

const isModrinthProject = (data: unknown): data is ModrinthProject => {
  return typeof data === "object" && data !== null && "title" in data;
};
