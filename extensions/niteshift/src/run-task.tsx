// src/run-task.tsx
//
// no-view command. Reads the prompt from the Raycast command argument,
// infers the user's default repo and model from their most recent task
// (mirroring the CLI's inferLastUsedModel approach), creates the task
// via the API, and opens the task page in the browser.

import { Toast, getPreferenceValues, open, showToast, type LaunchProps } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { ApiClient } from "./api/client";
import {
  AGENT_MODEL_CHOICES,
  DEFAULT_AGENT_MODEL_LABEL,
  type CreateTaskRequest,
  type CreateTaskResponse,
  type Repository,
} from "./api/types";
import { getAuthCommand, loadCliAuth } from "./lib/cli-auth";
import { getEnvironmentConfig, type Environment } from "./lib/env";

interface Preferences {
  environment: Environment;
}

export default async function Command(props: LaunchProps<{ arguments: Arguments.RunTask }>) {
  const prompt = props.arguments.prompt?.trim();
  if (!prompt) {
    await showFailureToast(new Error("Prompt is required"));
    return;
  }

  const { environment } = getPreferenceValues<Preferences>();

  const auth = loadCliAuth(environment);
  if (!auth) {
    await showFailureToast(
      new Error(`Run \`${getAuthCommand(environment)}\` in your terminal first.`),
      { title: "Niteshift CLI auth required" },
    );
    return;
  }

  const toast = await showToast({ style: Toast.Style.Animated, title: "Creating task…" });

  try {
    const { baseUrl } = getEnvironmentConfig(environment);
    const client = new ApiClient(baseUrl, auth.token);

    // Fetch repos (needed to validate the default and build the task URL).
    const reposResponse = await client.get<{ repositories?: Repository[] }>(
      "/api/github/repositories",
    );
    const repos = (reposResponse.repositories ?? [])
      .slice()
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
    if (repos.length === 0) {
      throw new Error(
        "No linked repositories found. Enable a repository in the Niteshift web UI first.",
      );
    }

    // Infer defaults from the user's most recent task — mirrors the CLI's
    // inferLastUsedModel (niteshift-cli/src/actions/run-task.ts). The source
    // of truth is the API, not local storage, so a model or repo change made
    // in the web UI (or any other client) is reflected on the next run.
    type RecentTask = { id: string; model?: string; repositoryId?: string };
    const recentResponse = await client.get<{ tasks?: RecentTask[] }>("/api/task", { limit: "1" });
    const mostRecent = recentResponse.tasks?.[0];

    // Default repo: most-recent task's repo if it's in the user's accessible
    // list, else the first repo alphabetically.
    const defaultRepo =
      (mostRecent?.repositoryId && repos.find((r) => r.id === mostRecent.repositoryId)) || repos[0];

    // Default model: most-recent task's model if it's a known value in
    // AGENT_MODEL_CHOICES, else the DEFAULT_AGENT_MODEL_LABEL's value.
    const fallbackModelValue = AGENT_MODEL_CHOICES.find(
      (c) => c.label === DEFAULT_AGENT_MODEL_LABEL,
    )!.value;
    const defaultModelValue =
      mostRecent?.model && AGENT_MODEL_CHOICES.some((c) => c.value === mostRecent.model)
        ? mostRecent.model
        : fallbackModelValue;

    // Create the task.
    const body: CreateTaskRequest = {
      repositoryId: defaultRepo.id,
      prompt,
      model: defaultModelValue,
    };
    const response = await client.post<CreateTaskResponse>("/api/task", body);
    const taskUrl = client.taskUrl(defaultRepo.fullName, response.task.id);

    // Display label for the toast (map value back to label for readability).
    const modelDisplayLabel =
      AGENT_MODEL_CHOICES.find((c) => c.value === defaultModelValue)?.label ?? defaultModelValue;

    toast.style = Toast.Style.Success;
    toast.title = "Task created";
    toast.message = `${defaultRepo.fullName} · ${modelDisplayLabel}`;

    await open(taskUrl);
  } catch (error) {
    toast.hide();
    await showFailureToast(error, { title: "Failed to create task" });
  }
}
