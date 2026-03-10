import {
  Action,
  ActionPanel,
  List,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useEffect, useState } from "react";

import { setTrackedProject } from "./storage";
import { listProjects, VercelProject } from "./vercel";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Unexpected error";
}

export default function AddTrackerView() {
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [projects, setProjects] = useState<VercelProject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      const preferences = getPreferenceValues<{ apiKey?: string }>();
      const storedApiKey = preferences.apiKey?.trim() || null;
      if (!storedApiKey) {
        setStatusMessage("Set your Vercel API key in extension preferences");
        return;
      }

      if (!isMounted) {
        return;
      }

      setApiKeyState(storedApiKey);
      await fetchProjects(storedApiKey);
    }

    bootstrap().catch(async (error) => {
      await showToast({
        style: Toast.Style.Failure,
        title: "Unable to initialize command",
        message: getErrorMessage(error),
      });
      if (isMounted) {
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    // Safety net so this command never appears to load forever.
    const timeout = setTimeout(() => {
      setIsLoading(false);
      setStatusMessage((current) => current ?? "Timed out while loading projects");
    }, 15000);

    return () => clearTimeout(timeout);
  }, []);

  async function fetchProjects(resolvedApiKey: string) {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const loadedProjects = await listProjects(resolvedApiKey);
      setProjects(loadedProjects);
      if (loadedProjects.length === 0) {
        setStatusMessage("No projects found for this account");
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not load projects",
        message: getErrorMessage(error),
      });
      setStatusMessage("Could not load projects with the configured API key");
    } finally {
      setIsLoading(false);
    }
  }

  async function selectProject(project: VercelProject) {
    await setTrackedProject(project);

    await showToast({
      style: Toast.Style.Success,
      title: "Tracker added",
      message: `Now tracking ${project.name}`,
    });
  }

  if (!apiKey) {
    return (
      <List>
        <List.EmptyView
          title="Missing Vercel API key"
          description="Set your API key in extension preferences, then rerun this command."
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Select a Vercel project to track">
      {projects.map((project) => (
        <List.Item
          key={project.id}
          title={project.name}
          subtitle={project.id}
          actions={
            <ActionPanel>
              <Action title="Track Project" onAction={() => selectProject(project)} />
              <Action title="Reload Projects" onAction={() => fetchProjects(apiKey)} />
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ))}
      {!isLoading && projects.length === 0 ? (
        <List.EmptyView
          title="No projects found"
          description={statusMessage ?? "Verify your API key and project access in Vercel."}
        />
      ) : null}
    </List>
  );
}
