import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { getAllShortLinks } from "../api";
import { captureException } from "@raycast/api";
import { WorkspaceId } from "../types";

export const useShortLinks = ({ workspaceId }: WorkspaceId) => {
  const {
    data: shortLinks,
    revalidate,
    isLoading,
    error,
  } = useCachedPromise(getAllShortLinks, [{ workspaceId }], {
    initialData: [],
    execute: workspaceId.length > 0,
    onError: async (err) => {
      captureException(err);
      await showFailureToast(err, { title: "❗ Failed to fetch short links" });
      throw err;
    },
  });

  return { shortLinks, revalidate, isLoading: (!shortLinks && !error) || isLoading, error };
};
