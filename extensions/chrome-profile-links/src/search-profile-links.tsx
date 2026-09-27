import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  getPreferenceValues,
  Icon,
  Keyboard,
  LaunchProps,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { getFavicon, useCachedState, useFrecencySorting, usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { ProfileLinkForm } from "./components/ProfileLinkForm";
import { ProfilePicker } from "./components/ProfilePicker";
import { BookmarkLink, getChromeBookmark, getChromeBookmarks, isBookmarkId } from "./lib/bookmarks";
import { ChromeProfile, getChromeProfiles } from "./lib/chrome";
import { openLink } from "./lib/open";
import { quicklinkFor } from "./lib/quicklink";
import { deleteProfileLink, getProfileLink, getProfileLinks, ProfileLink } from "./lib/storage";

interface LaunchContext {
  /** Set by quicklinks created with "Create Quicklink": open this link right away. */
  linkId?: string;
}

export default function Command({ launchContext, fallbackText }: LaunchProps<{ launchContext: LaunchContext }>) {
  if (launchContext?.linkId) {
    return <OpenFromQuicklink linkId={launchContext.linkId} />;
  }
  // When used as a fallback command, start with the text typed in root search.
  return <ProfileLinkList initialSearchText={fallbackText} />;
}

function OpenFromQuicklink({ linkId }: { linkId: string }) {
  const [needsPicker, setNeedsPicker] = useState<ProfileLink>();

  useEffect(() => {
    (async () => {
      const [link, profiles] = await Promise.all([
        isBookmarkId(linkId) ? getChromeBookmark(linkId) : getProfileLink(linkId),
        getChromeProfiles(),
      ]);
      if (!link) {
        await showToast({ style: Toast.Style.Failure, title: "This link no longer exists" });
        return;
      }
      if (link.profileDirectory && profiles.some((p) => p.directory === link.profileDirectory)) {
        await openLink(link.url, link.profileDirectory);
      } else {
        setNeedsPicker(link);
      }
    })();
  }, [linkId]);

  if (needsPicker) {
    return <ProfilePicker url={needsPicker.url} title={needsPicker.title} />;
  }
  return <List isLoading />;
}

type ListLink = ProfileLink | BookmarkLink;

function isBookmark(link: ListLink): link is BookmarkLink {
  return isBookmarkId(link.id);
}

const FILTER_ALL = "all";
const FILTER_SAVED = "saved";
const FILTER_BOOKMARKS = "bookmarks";
const FILTER_ASK = "ask";
const FILTER_PROFILE = "profile:";
const FILTER_TAG = "tag:";

function matchesFilter(link: ListLink, filter: string): boolean {
  if (filter === FILTER_SAVED) return !isBookmark(link);
  if (filter === FILTER_BOOKMARKS) return isBookmark(link);
  if (filter === FILTER_ASK) return !link.profileDirectory;
  if (filter.startsWith(FILTER_PROFILE)) return link.profileDirectory === filter.slice(FILTER_PROFILE.length);
  if (filter.startsWith(FILTER_TAG)) return link.tags?.includes(filter.slice(FILTER_TAG.length)) ?? false;
  return true;
}

function ProfileLinkList({ initialSearchText }: { initialSearchText?: string }) {
  const [searchText, setSearchText] = useState(initialSearchText ?? "");
  const { data: links, isLoading: isLoadingLinks, revalidate } = usePromise(getProfileLinks);
  const { data: profiles, isLoading: isLoadingProfiles } = usePromise(getChromeProfiles, [], {
    failureToastOptions: { title: "Cannot read Chrome profiles" },
  });

  const { showBookmarks } = getPreferenceValues<Preferences.SearchProfileLinks>();
  const { data: bookmarks, isLoading: isLoadingBookmarks } = usePromise(
    (directories: string[]) => getChromeBookmarks(directories),
    [profiles?.map((p) => p.directory) ?? []],
    {
      execute: showBookmarks && profiles !== undefined,
      failureToastOptions: { title: "Cannot read Chrome bookmarks" },
    },
  );

  const [storedFilter, setFilter] = useCachedState("filter", FILTER_ALL);

  const profileByDirectory = new Map(profiles?.map((p) => [p.directory, p]));

  // Hide bookmarks that are already saved as a link for the same profile.
  const savedKeys = new Set((links ?? []).map((link) => `${link.profileDirectory}\n${link.url}`));
  const allLinks: ListLink[] = [
    ...(links ?? []),
    ...(showBookmarks ? (bookmarks ?? []) : []).filter((b) => !savedKeys.has(`${b.profileDirectory}\n${b.url}`)),
  ];
  const allTags = [...new Set(allLinks.flatMap((link) => link.tags ?? []))].sort((a, b) => a.localeCompare(b));

  // Fall back to "All Links" when the remembered profile or tag no longer exists.
  const filterExists =
    storedFilter === FILTER_ALL ||
    storedFilter === FILTER_SAVED ||
    (storedFilter === FILTER_BOOKMARKS && showBookmarks) ||
    storedFilter === FILTER_ASK ||
    (storedFilter.startsWith(FILTER_PROFILE) &&
      (!profiles || profileByDirectory.has(storedFilter.slice(FILTER_PROFILE.length)))) ||
    (storedFilter.startsWith(FILTER_TAG) && (!links || allTags.includes(storedFilter.slice(FILTER_TAG.length))));
  const filter = filterExists ? storedFilter : FILTER_ALL;

  // Most frequently and recently opened links first; never-opened links alphabetically.
  const { data: sorted, visitItem } = useFrecencySorting(
    allLinks.filter((link) => matchesFilter(link, filter)),
    { namespace: "profile-links", sortUnvisited: (a, b) => a.title.localeCompare(b.title) },
  );

  const hasLinks = allLinks.length > 0;
  const isFiltered = filter !== FILTER_ALL || searchText.length > 0;

  return (
    <List
      isLoading={isLoadingLinks || isLoadingProfiles || isLoadingBookmarks}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering
      searchBarPlaceholder="Search by name, URL, profile or tag"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Profile or Tag" value={filter} onChange={setFilter}>
          <List.Dropdown.Item title="All Links" value={FILTER_ALL} icon={Icon.List} />
          {showBookmarks && (
            <>
              <List.Dropdown.Item title="Saved Links" value={FILTER_SAVED} icon={Icon.Link} />
              <List.Dropdown.Item title="Chrome Bookmarks" value={FILTER_BOOKMARKS} icon={Icon.Bookmark} />
            </>
          )}
          <List.Dropdown.Section title="Profiles">
            {profiles?.map((profile) => (
              <List.Dropdown.Item
                key={profile.directory}
                title={profile.name}
                value={`${FILTER_PROFILE}${profile.directory}`}
                icon={profile.icon}
              />
            ))}
            <List.Dropdown.Item title="Ask Every Time" value={FILTER_ASK} icon={Icon.QuestionMarkCircle} />
          </List.Dropdown.Section>
          {allTags.length > 0 && (
            <List.Dropdown.Section title="Tags">
              {allTags.map((tag) => (
                <List.Dropdown.Item key={tag} title={tag} value={`${FILTER_TAG}${tag}`} icon={Icon.Tag} />
              ))}
            </List.Dropdown.Section>
          )}
        </List.Dropdown>
      }
    >
      {hasLinks && isFiltered ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Matching Links"
          description={
            filter !== FILTER_ALL ? "Try another filter or press ⏎ to show all links." : "Try another search."
          }
          actions={
            <ActionPanel>
              {filter !== FILTER_ALL && (
                <Action title="Show All Links" icon={Icon.List} onAction={() => setFilter(FILTER_ALL)} />
              )}
              <CreateLinkAction onSaved={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.Link}
          title="No Profile Links Yet"
          description="Press ⏎ to save a URL with the Chrome profile it should open in."
          actions={
            <ActionPanel>
              <CreateLinkAction onSaved={revalidate} />
            </ActionPanel>
          }
        />
      )}
      {sorted.map((link) => (
        <ProfileLinkItem
          key={link.id}
          link={link}
          profile={link.profileDirectory ? profileByDirectory.get(link.profileDirectory) : undefined}
          profilesLoaded={profiles !== undefined}
          onChange={revalidate}
          onOpen={() => visitItem(link)}
        />
      ))}
    </List>
  );
}

interface ItemProps {
  link: ListLink;
  profile?: ChromeProfile;
  profilesLoaded: boolean;
  onChange: () => void;
  onOpen: () => void;
}

function ProfileLinkItem({ link, profile, profilesLoaded, onChange, onOpen }: ItemProps) {
  const missingProfile = Boolean(link.profileDirectory && profilesLoaded && !profile);

  const accessory: List.Item.Accessory = profile
    ? { icon: profile.icon, text: profile.name, tooltip: profile.email ?? profile.name }
    : missingProfile
      ? { icon: Icon.Warning, text: "Profile not found", tooltip: `"${link.profileDirectory}" no longer exists` }
      : { icon: Icon.QuestionMarkCircle, text: "Ask", tooltip: "Choose a profile when opening" };

  const bookmark = isBookmark(link);
  const tagAccessories: List.Item.Accessory[] = bookmark
    ? [
        link.folders.length > 0
          ? { tag: link.folders.join(" / "), icon: Icon.Bookmark, tooltip: "Chrome bookmark folder" }
          : { icon: Icon.Bookmark, tooltip: "Chrome bookmark" },
      ]
    : (link.tags ?? []).map((tag) => ({ tag, icon: Icon.Tag }));

  return (
    <List.Item
      icon={getFavicon(link.url, { fallback: Icon.Globe })}
      title={link.title}
      subtitle={link.url}
      keywords={[link.url, profile?.name ?? "", ...(link.tags ?? [])].filter(Boolean)}
      accessories={[...tagAccessories, accessory]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {profile ? (
              <Action
                title={`Open in ${profile.name}`}
                icon={Icon.Globe}
                onAction={async () => {
                  onOpen();
                  await openLink(link.url, profile.directory);
                }}
              />
            ) : (
              <Action.Push
                title="Open with Profile…"
                icon={Icon.Globe}
                target={<ProfilePicker url={link.url} title={link.title} onOpen={onOpen} />}
              />
            )}
            {profile && (
              <Action.Push
                title="Open with Another Profile…"
                icon={Icon.PersonCircle}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
                target={<ProfilePicker url={link.url} title={link.title} onOpen={onOpen} />}
              />
            )}
            <Action.CopyToClipboard title="Copy URL" content={link.url} shortcut={Keyboard.Shortcut.Common.Copy} />
          </ActionPanel.Section>
          {bookmark ? (
            <ActionPanel.Section>
              <Action.Push
                title="Save as Profile Link"
                icon={Icon.SaveDocument}
                shortcut={Keyboard.Shortcut.Common.Edit}
                target={
                  <ProfileLinkForm
                    draft={{
                      title: link.title,
                      url: link.url,
                      profileDirectory: link.profileDirectory,
                      tags: link.tags,
                    }}
                    onSaved={onChange}
                  />
                }
              />
              <CreateLinkAction onSaved={onChange} />
              <AddToRootSearchAction link={link} />
            </ActionPanel.Section>
          ) : (
            <SavedLinkActions link={link} onChange={onChange} />
          )}
        </ActionPanel>
      }
    />
  );
}

function CreateLinkAction({ onSaved }: { onSaved: () => void }) {
  return (
    <Action.Push
      title="Create Profile Link"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<ProfileLinkForm onSaved={onSaved} />}
    />
  );
}

function AddToRootSearchAction({ link }: { link: ListLink }) {
  return (
    <Action.CreateQuicklink
      title="Add to Root Search"
      quicklink={quicklinkFor(link)}
      shortcut={{ modifiers: ["cmd", "shift"], key: "q" }}
    />
  );
}

function SavedLinkActions({ link, onChange }: { link: ProfileLink; onChange: () => void }) {
  return (
    <>
      <ActionPanel.Section>
        <Action.Push
          title="Edit Link"
          icon={Icon.Pencil}
          shortcut={Keyboard.Shortcut.Common.Edit}
          target={<ProfileLinkForm link={link} onSaved={onChange} />}
        />
        <Action.Push
          title="Duplicate Link"
          icon={Icon.Duplicate}
          shortcut={Keyboard.Shortcut.Common.Duplicate}
          target={<ProfileLinkForm draft={{ ...link, title: `${link.title} Copy` }} onSaved={onChange} />}
        />
        <CreateLinkAction onSaved={onChange} />
        <AddToRootSearchAction link={link} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Delete Link"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={Keyboard.Shortcut.Common.Remove}
          onAction={async () => {
            const confirmed = await confirmAlert({
              title: `Delete "${link.title}"?`,
              primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
            });
            if (!confirmed) return;
            await deleteProfileLink(link.id);
            onChange();
            await showToast({ style: Toast.Style.Success, title: "Link deleted" });
          }}
        />
      </ActionPanel.Section>
    </>
  );
}
