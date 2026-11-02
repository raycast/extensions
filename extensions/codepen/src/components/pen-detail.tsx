import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  Icon,
  List,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getClient } from "../lib/api";
import { useMutation, usePaged } from "../lib/hooks";
import { buildIssueLines, isBuildPending, versionSchema, type Pen } from "../lib/models";
import { CommonActions, EmptyView } from "./common";
import { PenForm } from "./pen-form";
import { PenFiles } from "./pen-files";
import { CollectionPicker } from "./collections";

export function PenActions({
  pen,
  refresh,
  detail = false,
  collection,
  onDeleted,
}: {
  pen: Pen;
  refresh: () => void;
  detail?: boolean;
  collection?: { id: string; title: string };
  onDeleted?: () => void;
}) {
  const mutation = useMutation();
  const { pop } = useNavigation();
  const v2 = pen.editor === "V2";
  const previewable = pen.access !== "Protected" && pen.access !== "Collaborators";
  return (
    <>
      <Action.OpenInBrowser title="Open in CodePen" url={pen.urls.editor} />
      {!detail && (
        <Action.Push
          title="Show Pen Details"
          icon={Icon.Sidebar}
          target={<PenDetail penId={pen.id} onChanged={refresh} />}
          shortcut={{ macOS: { modifiers: ["cmd"], key: "d" }, Windows: { modifiers: ["ctrl"], key: "d" } }}
        />
      )}
      <Action.Push
        title="Browse Source Files"
        icon={Icon.Document}
        target={<PenFiles penId={pen.id} onChanged={refresh} />}
        shortcut={{ macOS: { modifiers: ["cmd"], key: "f" }, Windows: { modifiers: ["ctrl"], key: "f" } }}
      />
      {previewable && pen.urls.preview && <Action.OpenInBrowser title="Open Preview" url={pen.urls.preview} />}
      {pen.deployment && <Action.OpenInBrowser title="Open Deployment" url={pen.deployment.url} />}
      <Action.CopyToClipboard title="Copy Pen URL" content={pen.urls.editor} shortcut={Keyboard.Shortcut.Common.Copy} />
      <ActionPanel.Section title="Organize">
        <Action.Push title="Add to Collection" icon={Icon.Folder} target={<CollectionPicker pen={pen} />} />
        {collection && (
          <Action
            title="Remove from Collection"
            icon={Icon.Minus}
            onAction={async () => {
              if (
                await confirmAlert({
                  title: "Remove Pen from Collection?",
                  message: `Remove “${pen.title}” from “${collection.title}”? The Pen itself will be kept.`,
                  primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
                })
              ) {
                await mutation.run(
                  "Pen removed from collection",
                  () => getClient().removeFromCollection(collection.id, pen.id),
                  refresh,
                );
              }
            }}
          />
        )}
        {v2 && (
          <Action.Push
            title="Edit Pen Details"
            icon={Icon.Pencil}
            target={<PenForm mode="edit" pen={pen} onSaved={refresh} />}
          />
        )}
        {v2 && (
          <Action.Push
            title="Fork Pen"
            icon={Icon.Duplicate}
            target={<PenForm mode="fork" pen={pen} onSaved={refresh} />}
          />
        )}
      </ActionPanel.Section>
      {v2 && (
        <ActionPanel.Section title="Versions and Deployment">
          <Action.Push title="Browse Versions" icon={Icon.Clock} target={<VersionList pen={pen} />} />
          <Action
            title={pen.deployment ? "Deploy Latest Version" : "Deploy Pen"}
            icon={Icon.Upload}
            onAction={async () => {
              if (
                await confirmAlert({
                  title: "Deploy Pen?",
                  message: `Deploy the latest saved version of “${pen.title}” to its hosted URL?`,
                  primaryAction: { title: "Deploy" },
                })
              )
                await mutation.run("Pen deployed", () => getClient().deployPen(pen.id), refresh);
            }}
          />
          {pen.deployment && (
            <Action
              title="Take Deployment Down"
              icon={Icon.Cloud}
              style={Action.Style.Destructive}
              onAction={async () => {
                if (
                  await confirmAlert({
                    title: "Take Deployment Down?",
                    message: `The hosted deployment of “${pen.title}” will stop being available.`,
                    primaryAction: { title: "Take Down", style: Alert.ActionStyle.Destructive },
                  })
                )
                  await mutation.run("Deployment taken down", () => getClient().undeployPen(pen.id), refresh);
              }}
            />
          )}
          <Action
            title="Trash Pen"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ macOS: { modifiers: ["ctrl"], key: "x" }, Windows: { modifiers: ["ctrl", "shift"], key: "x" } }}
            onAction={async () => {
              if (
                await confirmAlert({
                  title: "Trash Pen?",
                  message: `Move “${pen.title}” to the trash? You can restore it on CodePen for 3 days.`,
                  primaryAction: { title: "Trash Pen", style: Alert.ActionStyle.Destructive },
                })
              ) {
                await mutation.run(
                  "Pen moved to trash",
                  () => getClient().deletePen(pen.id),
                  () => {
                    if (detail) {
                      pop();
                      onDeleted?.();
                    } else refresh();
                  },
                );
              }
            }}
          />
        </ActionPanel.Section>
      )}
      <ActionPanel.Section>
        <Action.Push
          title="Create Pen"
          icon={Icon.Plus}
          target={<PenForm mode="create" onSaved={refresh} />}
          shortcut={Keyboard.Shortcut.Common.New}
        />
      </ActionPanel.Section>
    </>
  );
}

export function PenDetail({ penId, onChanged }: { penId: string; onChanged?: () => void }) {
  const { data: pen, error, isLoading, revalidate } = usePromise((id: string) => getClient().getPen(id), [penId]);
  const build = pen?.saved_version?.build;
  const screenshot =
    pen?.access !== "Protected" && pen?.access !== "Collaborators" ? pen?.screenshot_urls?.large : undefined;
  const markdown = pen
    ? [
        `# ${pen.title || "Untitled"}`,
        pen.description,
        screenshot ? `![Pen preview](${screenshot})` : "",
        pen.editor === "Classic" ? "Classic Pens are read-only through the API. Open in CodePen to make changes." : "",
        build ? `**Build: ${build.status}**${isBuildPending(build) ? " — refresh to check progress." : ""}` : "",
        ...buildIssueLines(build),
      ]
        .filter(Boolean)
        .join("\n\n")
    : (error?.message ?? "Loading Pen…");
  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={pen?.title ?? "Pen Details"}
      actions={
        <ActionPanel>
          {pen && (
            <PenActions
              pen={pen}
              refresh={() => {
                void revalidate();
                onChanged?.();
              }}
              onDeleted={onChanged}
              detail
            />
          )}
          <CommonActions refresh={revalidate} />
        </ActionPanel>
      }
      metadata={
        pen ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Editor" text={pen.editor === "V2" ? "CodePen 2.0" : "Classic"} />
            <Detail.Metadata.Label title="Privacy" text={pen.access} />
            <Detail.Metadata.Label title="Updated" text={new Date(pen.updated_at).toLocaleString()} />
            <Detail.Metadata.Label title="Template" text={pen.template ? "Yes" : "No"} />
            <Detail.Metadata.TagList title="Tags">
              {pen.tags.map((tag) => (
                <Detail.Metadata.TagList.Item key={tag} text={tag} />
              ))}
            </Detail.Metadata.TagList>
            {build && (
              <Detail.Metadata.Label
                title="Build"
                text={build.status}
                icon={{
                  source: build.status === "Success" ? Icon.CheckCircle : Icon.Clock,
                  tintColor: build.status === "Failed" ? Color.Red : undefined,
                }}
              />
            )}
            {pen.deployment && <Detail.Metadata.Link title="Deployment" text="Open Site" target={pen.deployment.url} />}
            <Detail.Metadata.Link title="Editor" text="Open CodePen" target={pen.urls.editor} />
          </Detail.Metadata>
        ) : undefined
      }
    />
  );
}

function VersionList({ pen }: { pen: Pen }) {
  const { data, error, isLoading, pagination, revalidate } = usePaged(
    `pens/${encodeURIComponent(pen.id)}/versions?per_page=50`,
    versionSchema,
  );
  return (
    <List navigationTitle={`${pen.title} — Versions`} isLoading={isLoading} pagination={pagination}>
      <EmptyView error={error} title="No Saved Versions" description="Save your Pen in CodePen to create a version.">
        <CommonActions refresh={revalidate} />
      </EmptyView>
      {data?.map((version) => (
        <List.Item
          key={version.id}
          icon={Icon.Clock}
          title={new Date(version.created_at).toLocaleString()}
          subtitle={version.id}
          accessories={[
            { tag: version.build?.status ?? "No Build" },
            ...(version.deployed ? [{ text: "Deployed" }] : []),
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Browse Source Files"
                icon={Icon.Document}
                target={<PenFiles penId={pen.id} versionId={version.id} />}
              />
              {version.preview_url && pen.access !== "Protected" && pen.access !== "Collaborators" && (
                <Action.OpenInBrowser title="Open Version Preview" url={version.preview_url} />
              )}
              <Action.CopyToClipboard title="Copy Version ID" content={version.id} />
              <CommonActions refresh={revalidate} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
