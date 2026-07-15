import { plane, initializePlaneClient } from "../api/auth";
import { withAccessToken } from "@raycast/utils";
import { STORAGE_WORKSPACE_SLUG_KEY } from "../helpers/keys";
import { List, LocalStorage, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import WorkspaceSlugForm from "./WorkspaceSlugForm";

const preferences = getPreferenceValues<Preferences>();

function AuthorizedView({ children }: { children: React.ReactNode }) {
  const [workspaceSlug, setWorkspaceSlug] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    async function checkWorkspace() {
      try {
        const apiKey = preferences.API_KEY || "";
        setToken(apiKey);
        const tokenKey = STORAGE_WORKSPACE_SLUG_KEY(apiKey);
        const storedSlug = await LocalStorage.getItem<string>(tokenKey);
        setWorkspaceSlug(storedSlug || null);
      } catch (error) {
        console.error("Failed to check workspace:", error);
      } finally {
        setIsLoading(false);
      }
    }
    checkWorkspace();
  }, []);

  function handleWorkspaceSlugSubmit(workspaceSlug: string) {
    // Initialize planeClient with the workspace slug
    initializePlaneClient(workspaceSlug, undefined, preferences.API_KEY);
    setWorkspaceSlug(workspaceSlug);
  }

  if (!preferences.API_KEY) {
    // if API_KEY is not set, we can just return the children and oauth flow will trigger
    return <>{children}</>;
  } else {
    if (isLoading) {
      return <List isLoading={true} />;
    }

    // if API_KEY is set, and no workspace slug is set, we need to show the workspace selection view
    if (!workspaceSlug) {
      return <WorkspaceSlugForm onWorkspaceSlugSubmit={handleWorkspaceSlugSubmit} token={token} />;
    }

    return <>{children}</>;
  }
}

export default withAccessToken(plane)(AuthorizedView);
