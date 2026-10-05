import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  open,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { createEntity, HubApiError } from "./api/client";
import { useProfiles, useWorkspaces } from "./hooks/useWorkspace";
import { entityIcon } from "./utils/formatters";
import { getConnection, RAYCAST_CONNECT_DEEPLINK } from "./utils/preferences";

interface CreateEntityProps {
  initialProfileSlug?: string;
  lockProfile?: boolean;
}

type FormValues = Record<string, string | boolean | Date | null | undefined>;

const ROOT_FIELDS = new Set(["status", "priority", "dueDate", "url"]);

function fieldId(slug: string) {
  return `property:${slug}`;
}

function formValueToProperty(type: string, value: FormValues[string], label: string): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (type === "boolean") {
    if (value === true || value === "true") return true;
    if (value === false || value === "false") return false;
    return undefined;
  }
  if (type === "number") {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) throw new Error(`${label} must be a number.`);
    return parsed;
  }
  if (type === "date") return value instanceof Date ? value.toISOString() : value;
  if (type === "array" || type === "object") {
    if (typeof value !== "string") throw new Error(`${label} must be valid JSON.`);
    try {
      const parsed = JSON.parse(value);
      if (type === "array" && !Array.isArray(parsed)) throw new Error();
      if (type === "object" && (parsed === null || Array.isArray(parsed) || typeof parsed !== "object"))
        throw new Error();
      return parsed;
    } catch {
      throw new Error(`${label} must be valid JSON ${type === "array" ? "array" : "object"}.`);
    }
  }
  return value;
}

/**
 * A live-profile power form. Capture remains the normal entry point; this is
 * for users who deliberately know the kind they want to create. Roles never
 * appear because they are attachable facets, not standalone entities.
 */
export default function CreateEntity({ initialProfileSlug, lockProfile = false }: CreateEntityProps) {
  const { pop } = useNavigation();
  const [connection, setConnection] = useState<Awaited<ReturnType<typeof getConnection>>>();
  const [workspaceId, setWorkspaceId] = useState("");
  const [profileSlug, setProfileSlug] = useState(initialProfileSlug ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void getConnection().then((resolved) => {
      setConnection(resolved);
    });
  }, []);

  const { data: workspaces = [], isLoading: workspacesLoading } = useWorkspaces(connection?.podUrl);
  const { data: baseProfiles = [], isLoading: baseProfilesLoading } = useProfiles(undefined, connection?.podUrl);
  const { data: scopedProfiles = [], isLoading: scopedProfilesLoading } = useProfiles(
    workspaceId || undefined,
    connection?.podUrl
  );
  const profiles = workspaceId ? scopedProfiles : baseProfiles;

  useEffect(() => {
    if (!profileSlug && profiles.length > 0)
      setProfileSlug(
        initialProfileSlug && profiles.some((p) => p.slug === initialProfileSlug)
          ? initialProfileSlug
          : profiles[0].slug
      );
    if (
      !lockProfile &&
      profileSlug &&
      profiles.length > 0 &&
      !profiles.some((profile) => profile.slug === profileSlug)
    ) {
      setProfileSlug(profiles[0].slug);
    }
  }, [profiles, profileSlug, initialProfileSlug, lockProfile]);

  if (connection === undefined) return <Detail isLoading markdown="" />;
  if (!connection) {
    return (
      <Detail
        markdown="# Connect Synap first\n\nRun **Connect to Synap Pod** once to create a live-schema entity."
        actions={
          <ActionPanel>
            <Action
              title="Open Connect to Synap Pod"
              icon={Icon.Link}
              onAction={() => open(RAYCAST_CONNECT_DEEPLINK)}
            />
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  const selectedProfile = profiles.find((candidate) => candidate.slug === profileSlug);
  // A workspace overlay can add fields to a pod-scoped profile, but the direct
  // create endpoint treats workspaceId as placement. Use the base schema for
  // pod-wide writes so the visible form and server validation agree; workspace
  // scoped profiles keep their selected workspace schema and placement.
  const profile =
    selectedProfile?.entityScope === "pod"
      ? (baseProfiles.find((candidate) => candidate.slug === selectedProfile.slug) ?? selectedProfile)
      : selectedProfile;
  const properties = profile?.properties ?? [];

  const submit = async (values: FormValues) => {
    if (!profile) {
      await showToast({ style: Toast.Style.Failure, title: "Choose an entity type" });
      return;
    }
    if (profile.entityScope === "workspace" && !workspaceId) {
      await showToast({ style: Toast.Style.Failure, title: "Choose a workspace for this entity type" });
      return;
    }
    const title = typeof values.title === "string" ? values.title.trim() : "";
    if (!title) {
      await showToast({ style: Toast.Style.Failure, title: "Title is required" });
      return;
    }

    setIsSubmitting(true);
    try {
      const propertiesInput: Record<string, unknown> = {};
      const root: Record<string, unknown> = {};
      for (const definition of properties) {
        const value = values[fieldId(definition.slug)];
        if (definition.required && (value === undefined || value === null || value === "")) {
          throw new Error(`${definition.displayName} is required.`);
        }
        const parsed = formValueToProperty(definition.type, value, definition.displayName);
        if (parsed === undefined) continue;
        if (ROOT_FIELDS.has(definition.slug)) root[definition.slug] = parsed;
        else propertiesInput[definition.slug] = parsed;
      }

      const result = await createEntity({
        profileSlug: profile.slug,
        title,
        content: typeof values.content === "string" && values.content.trim() ? values.content.trim() : undefined,
        ...(profile.entityScope === "workspace" ? { workspaceId } : {}),
        properties: propertiesInput,
        ...(root.status ? { status: String(root.status) } : {}),
        ...(root.priority ? { priority: root.priority as "low" | "medium" | "high" | "urgent" } : {}),
        ...(root.dueDate ? { dueDate: String(root.dueDate) } : {}),
        ...(root.url ? { url: String(root.url) } : {}),
        source: "raycast",
      });

      if (result.status === "denied") {
        await showToast({
          style: Toast.Style.Failure,
          title: `${profile.displayName} was not accepted`,
          message: result.summary,
        });
        return;
      }

      const receipt = result.writeReceipt;
      const reviewUrl = receipt?.reviewUrl ?? result.reviewUrl;
      if (receipt?.state === "partial") {
        await showToast({
          style: Toast.Style.Failure,
          title: `${profile.displayName} was only partly applied`,
          message: receipt.warnings?.join(" · ") ?? reviewUrl ?? result.summary,
          ...(reviewUrl
            ? {
                primaryAction: {
                  title: "Open review",
                  onAction: () => open(reviewUrl),
                },
              }
            : {}),
        });
        return;
      }

      if (result.status === "proposed" || receipt?.state === "pending") {
        await showToast({
          style: Toast.Style.Success,
          title: `${profile.displayName} queued for review`,
          message: reviewUrl ?? result.summary,
          ...(reviewUrl
            ? {
                primaryAction: {
                  title: "Open review",
                  onAction: () => open(reviewUrl),
                },
              }
            : {}),
        });
        return;
      }

      await showToast({
        style: Toast.Style.Success,
        title: `${profile.displayName} created`,
      });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not create entity",
        message: error instanceof HubApiError || error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={isSubmitting || workspacesLoading || baseProfilesLoading || scopedProfilesLoading}
      navigationTitle={profile ? `Create ${profile.displayName}` : "Create Entity"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={`Create ${profile?.displayName ?? "Entity"}`} icon={Icon.Plus} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="workspace" title="Workspace (if needed)" value={workspaceId} onChange={setWorkspaceId}>
        <Form.Dropdown.Item value="" title="No workspace — pod-wide base schema" />
        {workspaces.map((workspace) => (
          <Form.Dropdown.Item key={workspace.id} value={workspace.id} title={workspace.name} />
        ))}
      </Form.Dropdown>
      {!lockProfile && (
        <Form.Dropdown id="profile" title="Type" value={profileSlug} onChange={setProfileSlug}>
          <Form.Dropdown.Item value="" title="Choose an entity type" />
          {profiles.map((candidate) => {
            const { icon, tintColor } = entityIcon(candidate.slug);
            return (
              <Form.Dropdown.Item
                key={candidate.slug}
                value={candidate.slug}
                title={candidate.displayName}
                icon={{ source: icon, tintColor }}
              />
            );
          })}
        </Form.Dropdown>
      )}
      {profile && (
        <Form.Description
          title="Scope"
          text={
            profile.entityScope === "pod"
              ? "Stored pod-wide using the base schema. Workspace overlays are not applied by this direct-create form."
              : workspaceId
                ? "Stored in the selected workspace"
                : "Choose a workspace before creating this workspace-scoped type"
          }
        />
      )}
      <Form.Separator />
      <Form.TextField id="title" title="Title" placeholder="Name or title…" autoFocus />
      <Form.TextArea id="content" title="Content" placeholder="Optional context or details…" />
      {properties.map((definition) => {
        const id = fieldId(definition.slug);
        const title = `${definition.displayName}${definition.required ? " *" : ""}`;
        if (definition.type === "boolean") {
          if (definition.required) {
            return <Form.Checkbox key={id} id={id} label={title} />;
          }
          return (
            <Form.Dropdown key={id} id={id} title={title} defaultValue="">
              <Form.Dropdown.Item value="" title="Not set" />
              <Form.Dropdown.Item value="true" title="Yes" />
              <Form.Dropdown.Item value="false" title="No" />
            </Form.Dropdown>
          );
        }
        if (definition.type === "date")
          return <Form.DatePicker key={id} id={id} title={title} type={Form.DatePicker.Type.DateTime} />;
        if (definition.options?.length) {
          return (
            <Form.Dropdown key={id} id={id} title={title}>
              <Form.Dropdown.Item value="" title="Choose…" />
              {definition.options.map((option) => (
                <Form.Dropdown.Item key={option} value={option} title={option} />
              ))}
            </Form.Dropdown>
          );
        }
        if (definition.type === "array" || definition.type === "object") {
          return <Form.TextArea key={id} id={id} title={title} placeholder={`Valid JSON ${definition.type}`} />;
        }
        return (
          <Form.TextField
            key={id}
            id={id}
            title={title}
            placeholder={definition.type === "entity_id" ? "Entity ID…" : undefined}
          />
        );
      })}
    </Form>
  );
}
