import { showFailureToast, useFetch, useLocalStorage } from "@raycast/utils";
import { useEffect } from "react";
import { SELECTED_ORGANIZATION_SLUG_STORAGE_KEY, SELECTED_ORGANIZATION_STORAGE_KEY } from "../constants/workspace";
import { getNotraRequestInit, NOTRA_API_URL } from "../lib/notra";
import { setSelectedWorkspace } from "../lib/selected-workspace";
import type { ListWorkspacesResponse } from "../types";
import { resolveSelectedWorkspace } from "../utils/workspace";

export function useWorkspace() {
  const {
    value: storedOrganizationId,
    setValue: setStoredOrganizationId,
    isLoading: isLoadingStoredOrganization,
  } = useLocalStorage<string>(SELECTED_ORGANIZATION_STORAGE_KEY);
  // Kept next to the id so workspace links still work when the workspace list can't be loaded.
  const {
    value: storedOrganizationSlug,
    setValue: setStoredOrganizationSlug,
    isLoading: isLoadingStoredSlug,
  } = useLocalStorage<string>(SELECTED_ORGANIZATION_SLUG_STORAGE_KEY);
  const {
    data,
    error,
    isLoading: isLoadingWorkspaces,
  } = useFetch<ListWorkspacesResponse>(`${NOTRA_API_URL}/v1/me/workspaces`, {
    // Workspace listing is unscoped, so it must not depend on a possibly stale selection.
    ...getNotraRequestInit({ organizationId: null }),
    // Data hooks surface auth errors themselves; without a workspace list requests fall back to no header.
    onError: () => undefined,
  });

  const workspaces = data?.workspaces ?? [];
  const workspace = resolveSelectedWorkspace(data, storedOrganizationId, storedOrganizationSlug);
  const isLoading = isLoadingStoredOrganization || isLoadingStoredSlug || (isLoadingWorkspaces && !data && !error);

  // Set during render so hooks and actions further down this render already send the right header.
  setSelectedWorkspace(workspace);

  useEffect(() => {
    if (
      isLoading ||
      !data?.workspaces.length ||
      !workspace ||
      (workspace.id === storedOrganizationId && workspace.slug === storedOrganizationSlug)
    ) {
      return;
    }

    Promise.all([setStoredOrganizationId(workspace.id), setStoredOrganizationSlug(workspace.slug)]).catch((error) =>
      showFailureToast(error, { title: "Could not save workspace" }),
    );
  }, [
    data,
    isLoading,
    setStoredOrganizationId,
    setStoredOrganizationSlug,
    storedOrganizationId,
    storedOrganizationSlug,
    workspace,
  ]);

  async function switchWorkspace(organizationId: string) {
    if (organizationId === workspace?.id) {
      return;
    }

    const slug = workspaces.find((candidate) => candidate.id === organizationId)?.slug;
    await Promise.all([
      setStoredOrganizationId(organizationId),
      ...(slug !== undefined ? [setStoredOrganizationSlug(slug)] : []),
    ]);
  }

  return {
    hasMultipleWorkspaces: workspaces.length > 1,
    isLoading,
    switchWorkspace,
    workspace,
    workspaces,
  };
}
