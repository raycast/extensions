import { Action, ActionPanel, Icon, List, confirmAlert, showToast, Toast, Keyboard } from "@raycast/api";
import { useActiveProfile } from "../hooks/useActiveProfile";
import { useV0Api } from "../hooks/useV0Api";
import { v0ApiFetcher, V0ApiError } from "../lib/v0-api-utils";
import { useState } from "react";
import CreateProjectEnvVarForm from "./CreateProjectEnvVarForm";

interface ViewProjectEnvVarsProps {
  projectId: string;
}

interface FindEnvVarsResponse {
  object: string;
  data: EnvVar[];
}

interface EnvVar {
  id: string;
  key: string;
  value?: string;
  updatedAt?: string;
}

export default function ViewProjectEnvVars({ projectId }: ViewProjectEnvVarsProps) {
  const { activeProfileApiKey, activeProfileDefaultScope, isLoadingProfileDetails } = useActiveProfile();
  const [unmasked, setUnmasked] = useState<Record<string, boolean>>({});

  const { data, isLoading, revalidate, error } = useV0Api<FindEnvVarsResponse>(
    `https://api.v0.dev/v1/projects/${projectId}/env-vars?decrypted=true`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${activeProfileApiKey || ""}`,
        "x-scope": activeProfileDefaultScope || "",
      },
      execute: Boolean(activeProfileApiKey) && !isLoadingProfileDetails,
    },
  );

  const items = (data?.data || []) as EnvVar[];

  async function handleDelete(envVar: EnvVar) {
    const confirmed = await confirmAlert({ title: `Delete ${envVar.key}?`, message: "This cannot be undone." });
    if (!confirmed) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting env var..." });
    try {
      await v0ApiFetcher<{ object: string; data: Array<{ id: string; object: string; deleted: boolean }> }>(
        `https://api.v0.dev/v1/projects/${projectId}/env-vars/delete`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${activeProfileApiKey || ""}`,
            "x-scope": activeProfileDefaultScope || "",
            "Content-Type": "application/json",
          },
          body: { environmentVariableIds: [envVar.id] },
        },
      );
      toast.style = Toast.Style.Success;
      toast.title = "Deleted";
      revalidate();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Delete failed";
      toast.message = err instanceof V0ApiError ? err.message : (err as Error)?.message;
    }
  }

  return (
    <List
      isLoading={isLoading || isLoadingProfileDetails}
      searchBarPlaceholder="Search environment variables..."
      navigationTitle="Project Environment Variables"
    >
      <List.EmptyView title={error ? `Error: ${error.message}` : "No environment variables"} />
      {items.map((env) => {
        const showPlain = Boolean(unmasked[env.id]);
        const masked = env.value ? (showPlain ? env.value : "*".repeat(env.value.length)) : "";
        const updatedAtDate = env.updatedAt ? new Date(env.updatedAt) : undefined;
        return (
          <List.Item
            key={env.id}
            title={env.key}
            subtitle={masked}
            accessories={updatedAtDate ? [{ date: updatedAtDate, tooltip: "Last updated" }] : []}
            actions={
              <ActionPanel>
                <Action
                  title="Refresh"
                  onAction={() => revalidate()}
                  icon={Icon.RotateClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                />
                <Action
                  icon={Icon.Eye}
                  title={showPlain ? "Hide Value" : "View Value"}
                  onAction={() => setUnmasked((p) => ({ ...p, [env.id]: !showPlain }))}
                />
                <Action.CopyToClipboard
                  title="Copy Value"
                  content={env.value || ""}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.CopyToClipboard
                  title="Copy Full Environment Variable"
                  content={`${env.key}=${env.value || ""}`}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
                <Action.Push
                  title="Update Environment Variable"
                  icon={Icon.Pencil}
                  target={
                    <CreateProjectEnvVarForm
                      projectId={projectId}
                      onCreated={() => revalidate()}
                      existingEnvVar={{ id: env.id, key: env.key, value: env.value }}
                    />
                  }
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                />
                <Action.Push
                  title="Add Environment Variable"
                  icon={Icon.PlusCircle}
                  target={<CreateProjectEnvVarForm projectId={projectId} onCreated={() => revalidate()} />}
                  shortcut={Keyboard.Shortcut.Common.New}
                />
                <Action
                  title="Delete Environment Variable"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleDelete(env)}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
