import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Detail,
  Form,
  Icon,
  List,
  Toast,
  showToast,
  confirmAlert,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedPromise, useForm } from "@raycast/utils";
import { useState } from "react";
import { runRemote } from "../lib/ssh";
import { loadProfilesData, applyProfile, writeProfileMeta, validateProfileName, ProfileMeta } from "../lib/profiles";
import { verifyTrafficPath, formatTrafficVerification } from "../lib/health";
import { shQuote, getPaths, shortDate, mdCode, parseErrorMessage } from "../lib/utils";

function profileSubtitle(isActive: boolean, meta: ProfileMeta | undefined): string {
  const updated = shortDate(meta?.updatedAt);
  return updated ? `Updated: ${updated}` : "";
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

const SETUP_SSH_INSTRUCTIONS = [
  "# Setup SSH Connection",
  "",
  "XKeen Manager could not reach your router over SSH.",
  "",
  "1. Run the **Setup SSH Connection** command from Raycast — it installs a passwordless SSH key for the router.",
  "2. Check the **SSH Connection** preference for this extension. It should be a host alias from `~/.ssh/config` (default: `xkeen`).",
  "3. Make sure the router is powered on and reachable on your network.",
  "",
  "Once fixed, use **Retry** to reload profiles.",
].join("\n");

function SetupSshInstructions() {
  return <Detail markdown={SETUP_SSH_INSTRUCTIONS} />;
}

function CreateProfileForm(props: { onAfterSave: () => void; sourceProfileName?: string; defaultName?: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const { configDir, profilesDir } = getPaths();
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<{ name: string }>({
    initialValues: { name: props.defaultName ?? "" },
    validation: {
      name: (value) => validateProfileName((value ?? "").trim()),
    },
    onSubmit: async (values) => {
      const name = values.name.trim();

      const sourceProfile = props.sourceProfileName?.trim();
      if (sourceProfile) {
        const sourceErr = validateProfileName(sourceProfile);
        if (sourceErr) {
          await showToast({ style: Toast.Style.Failure, title: "Invalid Source Profile", message: sourceErr });
          return;
        }
      }

      setIsLoading(true);
      try {
        const qProfilesDir = shQuote(profilesDir);
        const qConfigDir = shQuote(configDir);
        const qName = shQuote(name);
        const qSourceProfile = sourceProfile ? shQuote(sourceProfile) : null;

        const remoteCmd =
          `set -e; PROFILES_DIR=${qProfilesDir}; CONFIG_DIR=${qConfigDir}; NAME=${qName}; ` +
          (qSourceProfile
            ? `SOURCE_PROFILE=${qSourceProfile}; SOURCE_FILE="$PROFILES_DIR/$SOURCE_PROFILE/04_outbounds.json"; `
            : `SOURCE_FILE="$CONFIG_DIR/04_outbounds.json"; `) +
          `mkdir -p "$PROFILES_DIR/$NAME" && ` +
          `cp "$SOURCE_FILE" "$PROFILES_DIR/$NAME/04_outbounds.json" && ` +
          `echo "$NAME" > "$PROFILES_DIR/.active" && ` +
          `xkeen -restart`;

        await runRemote(remoteCmd);
        await writeProfileMeta(profilesDir, name, {
          sourceProfile: sourceProfile || undefined,
          lastAppliedAt: new Date().toISOString(),
          lastKnownGood: true,
        });
        const verification = await verifyTrafficPath().catch(() => null);
        const verifyMsg = verification ? formatTrafficVerification(verification) : "Verification unavailable";
        await showToast({
          style: Toast.Style.Success,
          title: "Created & Switched",
          message: `${name} · ${verifyMsg}`,
        });
        props.onAfterSave();
        pop();
      } catch (e) {
        await showFailureToast(e, { title: "Failed" });
      } finally {
        setIsLoading(false);
      }
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create & Switch" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="New Profile Name" placeholder="e.g. germany" {...itemProps.name} />
      <Form.Description
        text={
          props.sourceProfileName
            ? `Creates a copy of '${props.sourceProfileName}' and switches to it immediately.`
            : "Creates a copy of current server settings and switches to it immediately."
        }
      />
    </Form>
  );
}

function RenameProfileForm(props: { oldName: string; onAfterSave: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const { profilesDir } = getPaths();
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<{ name: string }>({
    initialValues: { name: props.oldName },
    validation: {
      name: (value) => validateProfileName((value ?? "").trim()),
    },
    onSubmit: async (values) => {
      const newName = values.name.trim();
      if (!newName || newName === props.oldName) return;
      const oldErr = validateProfileName(props.oldName);
      if (oldErr) {
        await showToast({ style: Toast.Style.Failure, title: "Invalid Current Profile Name", message: oldErr });
        return;
      }
      setIsLoading(true);
      try {
        const qProfilesDir = shQuote(profilesDir);
        const qOldName = shQuote(props.oldName);
        const qNewName = shQuote(newName);
        await runRemote(
          `set -e; PROFILES_DIR=${qProfilesDir}; OLD=${qOldName}; NEW=${qNewName}; ` +
            `mv "$PROFILES_DIR/$OLD" "$PROFILES_DIR/$NEW" && ` +
            `if [ -f "$PROFILES_DIR/.active" ] && [ "$(cat "$PROFILES_DIR/.active")" = "$OLD" ]; then echo "$NEW" > "$PROFILES_DIR/.active"; fi`,
        );
        await showToast({ style: Toast.Style.Success, title: "Renamed", message: newName });
        props.onAfterSave();
        pop();
      } catch (e) {
        await showFailureToast(e, { title: "Failed" });
      } finally {
        setIsLoading(false);
      }
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="New Name" {...itemProps.name} />
    </Form>
  );
}

export function ProfilesList(props: { onSwitched?: () => void }) {
  const { profilesDir } = getPaths();
  const { data, isLoading, error, revalidate } = useCachedPromise(loadProfilesData, [], {
    keepPreviousData: true,
  });
  const names = data?.names ?? [];
  const active = data?.active ?? "unknown";
  const metaByName = data?.metaByName ?? {};
  const hasProfiles = names.length > 0;

  async function switchTo(name: string) {
    await showToast({ style: Toast.Style.Animated, title: `Applying ${name}…` });
    try {
      await applyProfile(name);
      const verification = await verifyTrafficPath().catch(() => null);
      const verifyMsg = verification ? formatTrafficVerification(verification) : "Verification unavailable";
      await showToast({ style: Toast.Style.Success, title: "Applied!", message: `${name} · ${verifyMsg}` });
      props.onSwitched?.();
      revalidate();
    } catch (e) {
      await showFailureToast(e, { title: "Switch failed" });
    }
  }

  async function deleteProfile(name: string) {
    const nameErr = validateProfileName(name);
    if (nameErr) {
      await showToast({ style: Toast.Style.Failure, title: "Invalid Profile Name", message: nameErr });
      return;
    }
    if (name === active) {
      await showToast({ style: Toast.Style.Failure, title: "Cannot delete active profile" });
      return;
    }
    const confirmed = await confirmAlert({
      title: `Delete '${name}'?`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      const qProfilesDir = shQuote(profilesDir);
      const qName = shQuote(name);
      await runRemote(`set -e; PROFILES_DIR=${qProfilesDir}; NAME=${qName}; rm -rf -- "$PROFILES_DIR/$NAME"`);
      await showToast({ style: Toast.Style.Success, title: "Deleted" });
      revalidate();
    } catch (e) {
      await showFailureToast(e, { title: "Error" });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Server profiles…">
      <List.Section title="Actions">
        <List.Item
          title="Create New Profile (Duplicate Current)"
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action.Push title="Create" target={<CreateProfileForm onAfterSave={revalidate} />} />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Available Servers">
        {error && (
          <List.Item
            title={hasProfiles ? "Connection error — showing cached data" : "Connection error"}
            subtitle={truncate(parseErrorMessage(error), 100)}
            icon={{ source: Icon.Warning, tintColor: Color.Orange }}
            actions={
              <ActionPanel>
                <Action title="Retry" icon={Icon.RotateClockwise} onAction={revalidate} />
                <Action.Push
                  title="Setup SSH Connection"
                  icon={Icon.WrenchScrewdriver}
                  target={<SetupSshInstructions />}
                />
                <Action.CopyToClipboard title="Copy Error" content={parseErrorMessage(error)} />
              </ActionPanel>
            }
          />
        )}
        {hasProfiles
          ? names.map((name) => {
              const isActive = name === active;
              const meta = metaByName[name];
              const subtitle = profileSubtitle(isActive, meta);
              return (
                <List.Item
                  key={name}
                  title={name}
                  subtitle={subtitle}
                  icon={isActive ? Icon.Checkmark : Icon.Circle}
                  accessories={isActive ? [{ tag: { value: "Active", color: Color.Green } }] : undefined}
                  actions={
                    <ActionPanel>
                      {!isActive && (
                        <Action title="Switch to This Server" icon={Icon.Switch} onAction={() => switchTo(name)} />
                      )}
                      <Action.Push
                        title="Duplicate"
                        icon={Icon.Plus}
                        target={
                          <CreateProfileForm
                            onAfterSave={revalidate}
                            sourceProfileName={name}
                            defaultName={`${name}-copy`}
                          />
                        }
                      />
                      <Action.Push
                        title="Rename"
                        icon={Icon.Pencil}
                        shortcut={{ modifiers: ["cmd"], key: "e" }}
                        target={<RenameProfileForm oldName={name} onAfterSave={revalidate} />}
                      />
                      <Action.Push
                        title="View Metadata"
                        target={
                          <Detail
                            markdown={mdCode(`${name} metadata`, JSON.stringify(metaByName[name] ?? {}, null, 2))}
                          />
                        }
                      />
                      {!isActive && (
                        <Action
                          title="Delete"
                          style={Action.Style.Destructive}
                          icon={Icon.Trash}
                          shortcut={{ modifiers: ["ctrl"], key: "x" }}
                          onAction={() => deleteProfile(name)}
                        />
                      )}
                      <Action title="Refresh List" icon={Icon.RotateClockwise} onAction={revalidate} />
                    </ActionPanel>
                  }
                />
              );
            })
          : !error && (
              <List.Item
                title="No profiles yet"
                subtitle="Use 'Create New Profile' above"
                icon={Icon.Info}
                actions={
                  <ActionPanel>
                    <Action.Push title="Create" target={<CreateProfileForm onAfterSave={revalidate} />} />
                    <Action title="Refresh List" icon={Icon.RotateClockwise} onAction={revalidate} />
                  </ActionPanel>
                }
              />
            )}
      </List.Section>
    </List>
  );
}
