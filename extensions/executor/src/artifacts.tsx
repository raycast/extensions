import { WorkspaceAction } from "./components/workspace-command";
import { workspaceConfirmationMessage, workspaceTitle } from "./lib/workspaces";
import { withWorkspace } from "./components/workspace-command";
import {
  Keyboard,
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  Detail,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  open,
  showToast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedPromise, usePromise } from "@raycast/utils";
import { useRef, useState, type ReactNode } from "react";
import { accountCacheKey, getArtifact, listArtifacts, listConnections, removeArtifact } from "./lib/client";
import { consoleUrl } from "./lib/console";
import { artifactSearchKeywords, escapeMarkdown, safeArtifactUrl, validateArtifactTitle } from "./lib/artifacts";
import { renameExecutorArtifact } from "./lib/artifact-ai";
import { asJson, codeBlock, formatDate, formatRelative, connectionPresentation } from "./lib/format";
import { integrationIcon, integrationLabel, useIntegrationDirectory } from "./lib/integrations";
import type { ArtifactSummary } from "./lib/types";

function MetadataForm({ artifact, onSaved }: { artifact: ArtifactSummary; onSaved: () => void }) {
  const { pop } = useNavigation();
  const [title, setTitle] = useState(artifact.title);
  const [description, setDescription] = useState(artifact.description ?? "");
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const saving = useRef(false);

  async function onSubmit() {
    if (saving.current) return;
    const validationError = validateArtifactTitle(title);
    setError(validationError);
    if (validationError) return;
    saving.current = true;
    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Saving Artifact Details" });
    try {
      const changes: { title?: string; description?: string } = {};
      if (title.trim() !== artifact.title) changes.title = title;
      if ((description.trim() || null) !== artifact.description) changes.description = description;
      if (Object.keys(changes).length > 0) {
        await renameExecutorArtifact({
          artifactId: artifact.id,
          expectedUpdatedAt: Number(artifact.updatedAt),
          ...changes,
        });
      }
      toast.style = Toast.Style.Success;
      toast.title = "Artifact Details Saved";
      onSaved();
      pop();
    } catch (saveError) {
      toast.hide();
      await showFailureToast(saveError, { title: "Could Not Save Artifact Details" });
    } finally {
      saving.current = false;
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={workspaceTitle(`Edit ${artifact.title}`)}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Details" icon={Icon.Pencil} onSubmit={onSubmit} />
          <WorkspaceAction />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Artifact title"
        value={title}
        error={error}
        onBlur={(event) => setError(validateArtifactTitle(event.target.value ?? ""))}
        onChange={(value) => {
          setTitle(value);
          if (error) setError(undefined);
        }}
      />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Describe when an agent should use this artifact"
        value={description}
        onChange={setDescription}
      />
    </Form>
  );
}

async function resolveArtifactUrl(artifactId: string): Promise<string> {
  const resolved = safeArtifactUrl(await consoleUrl(`/artifacts/${encodeURIComponent(artifactId)}`));
  if (!resolved) throw new Error("Executor did not return a safe artifact URL.");
  return resolved;
}

function ArtifactActions({
  artifact,
  onChanged,
  onDelete,
  detail = false,
  children,
}: {
  artifact: ArtifactSummary;
  onChanged: () => void;
  onDelete: () => Promise<boolean>;
  detail?: boolean;
  children?: ReactNode;
}) {
  const opening = useRef(false);

  async function openArtifact() {
    if (opening.current) return;
    opening.current = true;
    try {
      await open(await resolveArtifactUrl(artifact.id));
    } catch (error) {
      await showFailureToast(error, { title: "Could Not Open Artifact" });
    } finally {
      opening.current = false;
    }
  }

  async function copyLink() {
    if (opening.current) return;
    opening.current = true;
    try {
      await Clipboard.copy(await resolveArtifactUrl(artifact.id));
      await showToast({ style: Toast.Style.Success, title: "Artifact Link Copied" });
    } catch (error) {
      await showFailureToast(error, { title: "Could Not Copy Artifact Link" });
    } finally {
      opening.current = false;
    }
  }

  return (
    <>
      <ActionPanel.Section>
        <Action
          title="Open Artifact in Executor"
          shortcut={Keyboard.Shortcut.Common.Open}
          icon={Icon.Globe}
          onAction={openArtifact}
        />
        {!detail ? (
          <Action.Push
            title="View Artifact Details"
            shortcut={{ modifiers: ["cmd"], key: "i" }}
            icon={Icon.Info}
            target={<ArtifactDetail artifact={artifact} onChanged={onChanged} onDelete={onDelete} />}
          />
        ) : null}
        <Action.Push
          title="Edit Artifact Details"
          icon={Icon.Pencil}
          shortcut={Keyboard.Shortcut.Common.Edit}
          target={<MetadataForm artifact={artifact} onSaved={onChanged} />}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Copy">
        <Action
          title="Copy Artifact Link"
          shortcut={Keyboard.Shortcut.Common.Copy}
          icon={Icon.Link}
          onAction={copyLink}
        />
        {/* Preserve the API's standard initialism. */}
        {/* eslint-disable-next-line @raycast/prefer-title-case */}
        <Action.CopyToClipboard title="Copy Artifact ID" content={artifact.id} icon={Icon.Clipboard} />
      </ActionPanel.Section>
      {children}
      <ActionPanel.Section title="Navigation">
        <Action
          shortcut={Keyboard.Shortcut.Common.Refresh}
          title="Reload Artifacts"
          icon={Icon.RotateClockwise}
          onAction={onChanged}
        />
        <WorkspaceAction />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Delete Artifact"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={Keyboard.Shortcut.Common.Remove}
          onAction={onDelete}
        />
      </ActionPanel.Section>
    </>
  );
}

function ArtifactDetail({
  artifact,
  onChanged,
  onDelete,
}: {
  artifact: ArtifactSummary;
  onChanged: () => void;
  onDelete: () => Promise<boolean>;
}) {
  const { pop } = useNavigation();
  const directory = useIntegrationDirectory();
  const { data: connections = [] } = useCachedPromise(
    async (_scope: string) => {
      void _scope;
      return listConnections();
    },
    [accountCacheKey()],
  );
  const { data, isLoading, error, revalidate } = usePromise(async (id: string) => getArtifact(id), [artifact.id]);
  const current = data ?? artifact;
  const bindings = data?.bindings ? Object.entries(data.bindings) : [];
  const markdown = [
    `# ${escapeMarkdown(current.title)}`,
    "",
    current.description ? escapeMarkdown(current.description) : "_No description._",
    "",
    "Open this artifact in Executor to interact with it.",
    ...(error ? ["", `> ${escapeMarkdown(error.message)}`] : []),
  ].join("\n");

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={workspaceTitle(current.title)}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Scope">
            <Detail.Metadata.TagList.Item
              text={current.owner === "org" ? "Workspace" : "Personal"}
              color={current.owner === "org" ? Color.Purple : Color.Blue}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Artifact ID" text={current.id} />
          <Detail.Metadata.Label title="Created" text={formatDate(current.createdAt)} />
          <Detail.Metadata.Label title="Updated" text={formatDate(current.updatedAt)} />
          {bindings.length > 0 ? <Detail.Metadata.Separator /> : null}
          {bindings.map(([role, binding]) => (
            <Detail.Metadata.Label
              key={role}
              title={`Binding: ${integrationLabel(binding.integration, directory)}${role === binding.integration ? "" : ` (${role})`}`}
              text={
                connectionPresentation(
                  { integration: binding.integration, owner: binding.owner, name: binding.connection },
                  connections,
                ).text
              }
              icon={integrationIcon(binding.integration, directory)}
            />
          ))}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ArtifactActions
            detail
            artifact={current}
            onChanged={() => {
              revalidate();
              onChanged();
            }}
            onDelete={async () => {
              const deleted = await onDelete();
              if (deleted) pop();
              return deleted;
            }}
          >
            {data ? (
              <ActionPanel.Section title="Source">
                {bindings.length > 0 ? (
                  <Action.CopyToClipboard title="Copy Bindings JSON" content={asJson(data?.bindings)} />
                ) : null}
                <Action.Push
                  title="View Artifact Source"
                  icon={Icon.Code}
                  target={
                    <Detail
                      navigationTitle={workspaceTitle("Artifact Source")}
                      markdown={codeBlock(data.code, "tsx")}
                      actions={
                        <ActionPanel>
                          <Action.CopyToClipboard
                            title="Copy Source"
                            shortcut={Keyboard.Shortcut.Common.Copy}
                            content={data.code}
                          />
                          <Action.CopyToClipboard title="Copy Bindings JSON" content={asJson(data.bindings)} />
                          <WorkspaceAction />
                        </ActionPanel>
                      }
                    />
                  }
                />
              </ActionPanel.Section>
            ) : null}
          </ArtifactActions>
        </ActionPanel>
      }
    />
  );
}

function Artifacts() {
  const deleting = useRef(new Set<string>());
  const { data, isLoading, error, revalidate } = useCachedPromise(
    (_scope: string) => {
      void _scope;
      return listArtifacts();
    },
    [accountCacheKey()],
    {
      initialData: [],
      failureToastOptions: { title: "Could Not Load Artifacts" },
    },
  );
  const artifacts = data ?? [];

  async function onDelete(artifact: ArtifactSummary): Promise<boolean> {
    if (deleting.current.has(artifact.id)) return false;
    const confirmed = await confirmAlert({
      title: "Delete Artifact?",
      message: workspaceConfirmationMessage(
        `Artifact: ${artifact.title}\n\nThis permanently removes the artifact from Executor. Agents will no longer find it by title or ID.`,
      ),
      icon: Icon.Trash,
      primaryAction: { title: "Delete Artifact", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed || deleting.current.has(artifact.id)) return false;
    deleting.current.add(artifact.id);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting Artifact" });
    try {
      const result = await removeArtifact(artifact.id);
      if (!result.removed) throw new Error("Executor did not remove this artifact. Reload and try again.");
      toast.style = Toast.Style.Success;
      toast.title = "Artifact Deleted";
      revalidate();
      return true;
    } catch (deleteError) {
      toast.hide();
      await showFailureToast(deleteError, { title: "Could Not Delete Artifact" });
      return false;
    } finally {
      deleting.current.delete(artifact.id);
    }
  }

  return (
    <List
      navigationTitle={workspaceTitle("Browse Artifacts")}
      isLoading={isLoading}
      searchBarPlaceholder="Search artifacts by title, description, or ID"
    >
      <List.EmptyView
        icon={error ? Icon.Warning : Icon.AppWindowGrid2x2}
        title={error ? "Could Not Load Artifacts" : "No Artifacts Found"}
        description={
          error
            ? error.message
            : "Ask an agent to render a UI in Executor. Saved artifacts appear here and reopen in the browser."
        }
        actions={
          <ActionPanel>
            <Action
              shortcut={Keyboard.Shortcut.Common.Refresh}
              title="Reload Artifacts"
              icon={Icon.RotateClockwise}
              onAction={revalidate}
            />
            <WorkspaceAction />
          </ActionPanel>
        }
      />
      {artifacts.map((artifact) => (
        <List.Item
          key={artifact.id}
          icon={{ source: Icon.AppWindow, tintColor: Color.Blue }}
          title={artifact.title}
          subtitle={artifact.description ?? undefined}
          keywords={artifactSearchKeywords(artifact)}
          accessories={[
            { text: formatRelative(artifact.updatedAt), tooltip: `Updated ${formatDate(artifact.updatedAt)}` },
            {
              tag: {
                value: artifact.owner === "org" ? "Workspace" : "Personal",
                color: artifact.owner === "org" ? Color.Purple : Color.Blue,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <ArtifactActions artifact={artifact} onChanged={revalidate} onDelete={() => onDelete(artifact)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default withWorkspace(Artifacts);
