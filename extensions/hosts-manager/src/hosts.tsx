import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  Keyboard,
  List,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { CommonConfigForm } from "./common-form";
import { HostsDetail } from "./hosts-detail";
import { commitStore } from "./lib/apply";
import { readHostsFile } from "./lib/hosts-file";
import { parseManagedBlock } from "./lib/managed-block";
import { strings } from "./lib/strings";
import { loadStore, type HostsProfile, type HostsStore } from "./lib/storage";
import {
  NewProfileForm,
  ProfileContentForm,
  RenameProfileForm,
} from "./profile-form";

export default function Command() {
  const [store, setStore] = useState<HostsStore>();
  const [hostsContent, setHostsContent] = useState("");
  const [hostsReadFailed, setHostsReadFailed] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    const [nextStore, hosts] = await Promise.all([
      loadStore(),
      readHostsFile().then(
        (value) => ({ value }),
        (error: unknown) => ({ error }),
      ),
    ]);
    setStore(nextStore);
    if ("value" in hosts) {
      setHostsContent(hosts.value);
      setHostsReadFailed(undefined);
    } else {
      setHostsReadFailed(
        hosts.error instanceof Error
          ? hosts.error.message
          : String(hosts.error),
      );
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (!store) {
    return <List isLoading={isLoading} />;
  }

  const s = strings;

  // The public section is what /etc/hosts holds outside the applied profile.
  // When the file could not be read its content is unknown, so editing stays
  // unavailable: saving would write an empty public section back into the file.
  const publicContent = hostsReadFailed
    ? undefined
    : parseManagedBlock(hostsContent).commonContent;
  const readErrorMarkdown = `${s.failedToReadHosts}\n\n${hostsReadFailed ?? ""}`;
  const fileMarkdown = hostsReadFailed
    ? readErrorMarkdown
    : contentMarkdown(hostsContent);

  // Arrow consts (rather than function declarations) keep TypeScript's
  // narrowing of `store` from the guard above inside these callbacks.
  const applyProfile = async (profile: HostsProfile) => {
    const committed = await commitStore({
      previous: store,
      next: { ...store, activeProfileId: profile.id },
      sync: true,
      successTitle: s.applied(profile.name),
    });
    if (committed) await reload();
  };

  const cancelApply = async (profile: HostsProfile) => {
    const committed = await commitStore({
      previous: store,
      next: { ...store, activeProfileId: null },
      sync: true,
      successTitle: s.cancelled(profile.name),
    });
    if (committed) await reload();
  };

  const deleteProfile = async (profile: HostsProfile) => {
    const confirmed = await confirmAlert({
      title: s.deleteConfirmTitle(profile.name),
      message: s.deleteConfirmMessage,
      primaryAction: {
        title: s.delete,
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;

    const isActive = profile.id === store.activeProfileId;
    const committed = await commitStore({
      previous: store,
      next: {
        ...store,
        profiles: store.profiles.filter((item) => item.id !== profile.id),
        activeProfileId: isActive ? null : store.activeProfileId,
      },
      sync: isActive,
      successTitle: s.deleted(profile.name),
    });
    if (committed) await reload();
  };

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder={s.searchPlaceholder}
    >
      <List.Item
        id="hosts-file"
        title={s.viewHostsFile}
        icon={Icon.Eye}
        detail={<List.Item.Detail markdown={fileMarkdown} />}
        actions={
          <ActionPanel>
            <Action.Push
              title={s.openFullView}
              icon={Icon.Eye}
              shortcut={{ modifiers: ["cmd"], key: "h" }}
              target={<HostsDetail />}
            />
          </ActionPanel>
        }
      />

      <List.Section title={s.sectionPublic}>
        <List.Item
          id="common"
          title={s.publicConfiguration}
          icon={Icon.Globe}
          detail={
            <List.Item.Detail
              markdown={
                publicContent === undefined
                  ? readErrorMarkdown
                  : contentMarkdown(publicContent)
              }
            />
          }
          actions={
            <ActionPanel>
              {publicContent !== undefined && (
                <Action.Push
                  title={s.editPublicConfiguration}
                  icon={Icon.Pencil}
                  target={
                    <CommonConfigForm
                      store={store}
                      content={publicContent}
                      onDone={reload}
                    />
                  }
                />
              )}
              <Action.Push
                title={s.newProfile}
                icon={Icon.Plus}
                shortcut={Keyboard.Shortcut.Common.New}
                target={<NewProfileForm store={store} onDone={reload} />}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title={s.sectionProfiles}>
        {store.profiles.map((profile) => {
          const isActive = profile.id === store.activeProfileId;
          return (
            <List.Item
              key={profile.id}
              id={profile.id}
              title={profile.name}
              icon={isActive ? Icon.CheckCircle : Icon.Circle}
              detail={
                <List.Item.Detail markdown={contentMarkdown(profile.content)} />
              }
              actions={
                <ActionPanel>
                  <Action.Push
                    title={s.editProfile}
                    icon={Icon.Pencil}
                    target={
                      <ProfileContentForm
                        store={store}
                        profile={profile}
                        onDone={reload}
                      />
                    }
                  />
                  <Action.Push
                    title={s.renameProfile}
                    icon={Icon.Text}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    target={
                      <RenameProfileForm
                        store={store}
                        profile={profile}
                        onDone={reload}
                      />
                    }
                  />
                  {isActive ? (
                    <Action
                      title={s.cancelApply}
                      icon={Icon.XmarkCircle}
                      shortcut={{ modifiers: ["cmd"], key: "return" }}
                      onAction={() => cancelApply(profile)}
                    />
                  ) : (
                    <Action
                      title={s.applyProfile}
                      icon={Icon.CheckCircle}
                      shortcut={{ modifiers: ["cmd"], key: "return" }}
                      onAction={() => applyProfile(profile)}
                    />
                  )}
                  <Action
                    title={s.deleteProfile}
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => deleteProfile(profile)}
                  />
                  <ActionPanel.Section>
                    <Action.Push
                      title={s.newProfile}
                      icon={Icon.Plus}
                      shortcut={Keyboard.Shortcut.Common.New}
                      target={<NewProfileForm store={store} onDone={reload} />}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

/**
 * Renders hosts text as plain lines. A fenced code block would be the obvious
 * choice, but it paints its own background; instead each line is escaped so
 * `#` comments stay text, and ends with a hard line break.
 */
function contentMarkdown(content: string): string {
  const trimmed = content.trim();
  if (trimmed === "") return "";
  return trimmed
    .split("\n")
    .map((line) => `${line.replace(/^(\s*)([-*+>#])/, "$1\\$2")}  `)
    .join("\n");
}
