import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  LaunchProps,
  List,
  closeMainWindow,
  getPreferenceValues,
  popToRoot,
} from "@raycast/api";
import { showFailureToast, useCachedPromise, useCachedState } from "@raycast/utils";
import { useMemo, useState } from "react";

import { Link, parseLink } from "./lib/link";
import { LaunchMode, VivaldiNotFoundError, findExecutable, openInVivaldi, readProfiles } from "./lib/vivaldi";

type Preferences = {
  defaultAction: LaunchMode;
};

/** Empty means "whichever profile Vivaldi itself last used", which follows the open window. */
const FOLLOW_VIVALDI = "";

const KIND_LABEL: Record<Link["kind"], string | undefined> = {
  "as-typed": undefined,
  "assumed-https": "https added",
  "assumed-http": "http added",
  "local-file": "Local file",
};

export default function OpenLink(props: LaunchProps) {
  const { defaultAction } = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState(props.fallbackText ?? "");
  const [profile, setProfile] = useCachedState("profile", FOLLOW_VIVALDI);

  const executable = useMemo(() => findExecutable(), []);
  const { profiles, lastUsed } = useMemo(() => readProfiles(), []);

  const typedLink = useMemo(() => parseLink(searchText), [searchText]);

  // Read once per command launch: the clipboard is the source of most links, so it stands in
  // for the empty search bar instead of leaving the user with a blank screen.
  const { data: clipboardLink, isLoading } = useCachedPromise(
    async () => parseLink((await Clipboard.readText()) ?? ""),
    [],
    { keepPreviousData: false },
  );

  const link = typedLink ?? (searchText.trim().length === 0 ? clipboardLink : undefined);
  const fromClipboard = !typedLink && Boolean(link);

  async function open(mode: LaunchMode) {
    if (!link) {
      return;
    }

    try {
      openInVivaldi({ url: link.url, mode, profile });
      await closeMainWindow();
      await popToRoot({ clearSearchBar: true });
    } catch (error) {
      await showFailureToast(
        error,
        error instanceof VivaldiNotFoundError
          ? { title: "Vivaldi was not found" }
          : { title: "Could not open the link in Vivaldi" },
      );
    }
  }

  const newWindowAction = (
    <Action title="Open in New Window" icon={Icon.AppWindow} onAction={() => open("new-window")} />
  );

  const newTabAction = <Action title="Open in Current Window" icon={Icon.Globe} onAction={() => open("new-tab")} />;

  const profileName = profiles.find((candidate) => candidate.directory === profile)?.name;
  const followedName = profiles.find((candidate) => candidate.directory === lastUsed)?.name ?? lastUsed;

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Paste or type a link — vivaldi.com, www.stripe.com, localhost:3000"
      searchBarAccessory={
        profiles.length > 1 ? (
          <List.Dropdown tooltip="Vivaldi Profile" value={profile} onChange={setProfile} storeValue={false}>
            <List.Dropdown.Item
              title={followedName ? `Follow Vivaldi (${followedName})` : "Follow Vivaldi"}
              value={FOLLOW_VIVALDI}
              icon={Icon.Repeat}
            />
            <List.Dropdown.Section title="Profiles">
              {profiles.map((candidate) => (
                <List.Dropdown.Item
                  key={candidate.directory}
                  title={candidate.name}
                  value={candidate.directory}
                  icon={Icon.Person}
                />
              ))}
            </List.Dropdown.Section>
          </List.Dropdown>
        ) : undefined
      }
    >
      {link ? (
        <List.Section title={fromClipboard ? "From Clipboard" : "Link"}>
          <List.Item
            icon={link.kind === "local-file" ? Icon.Document : Icon.Link}
            title={link.title}
            subtitle={link.subtitle}
            accessories={[
              ...(profileName ? [{ icon: Icon.Person, tag: profileName }] : []),
              ...(KIND_LABEL[link.kind] ? [{ tag: KIND_LABEL[link.kind] as string }] : []),
            ]}
            actions={
              <ActionPanel>
                {defaultAction === "new-tab" ? newTabAction : newWindowAction}
                {defaultAction === "new-tab" ? newWindowAction : newTabAction}
                <Action.CopyToClipboard title="Copy Link" content={link.url} />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}

      <List.EmptyView
        icon={executable ? Icon.Link : Icon.ExclamationMark}
        title={
          executable
            ? searchText.trim().length === 0
              ? "Paste a link"
              : "That is not a link yet"
            : "Vivaldi was not found"
        }
        description={
          executable
            ? searchText.trim().length === 0
              ? "Anything with a host works: vivaldi.com, www.stripe.com, localhost:3000, or a file path."
              : `“${searchText.trim()}” has no host and no scheme, so there is nothing to open.`
            : "Looked under %LOCALAPPDATA%, Program Files and Program Files (x86). Install Vivaldi, or point this extension at it."
        }
      />
    </List>
  );
}
