import { Action, ActionPanel, Detail, Form, Icon, List, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  bookmarkError,
  discoverProfiles,
  readBookmarks,
  sourceId,
  type BookmarkFolder,
  type BookmarkSource,
  type Profile,
} from "./lib/bookmarks";
import { ErrorView, PreferencesAction, report, useData } from "./lib/ui";
function FolderForm({
  profile,
  selected,
  onSave,
}: {
  profile: Profile;
  selected: BookmarkSource;
  onSave: (s: BookmarkSource) => Promise<void>;
}) {
  const [folders, setFolders] = useState<BookmarkFolder[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const { pop } = useNavigation();
  useEffect(() => {
    void readBookmarks({ ...profile, folders: [] }, profile.name)
      .then((result) => setFolders(result.folders))
      .catch((e) => setError(bookmarkError(e, profile.name)))
      .finally(() => setLoading(false));
  }, [profile]);
  return (
    <Form
      navigationTitle={profile.name}
      isLoading={loading || busy}
      actions={
        <ActionPanel>
          {!loading && !error && (
            <Action.SubmitForm
              title="Save Folder Selection"
              onSubmit={async (v: { folders: string[] }) => {
                if (busy) return;
                setBusy(true);
                try {
                  await onSave({ ...selected, folders: v.folders ?? [] });
                  pop();
                } catch (e) {
                  await report(e);
                } finally {
                  setBusy(false);
                }
              }}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.Description
        text={
          error ||
          "Leave empty to search all folders. Selecting a folder includes its subfolders. Bookmarks stay in your browser."
        }
      />
      {!error && (
        <Form.TagPicker
          id="folders"
          title="Included Folders"
          defaultValue={selected.folders.filter((id) => folders.some((f) => f.id === id))}
          key={loading ? "loading" : "ready"}
        >
          {folders.map((f) => (
            <Form.TagPicker.Item key={f.id} value={f.id} title={f.name} />
          ))}
        </Form.TagPicker>
      )}
    </Form>
  );
}
export default function Command() {
  const { data, loading, error, update } = useData();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [scanning, setScanning] = useState(true);
  async function refresh() {
    setScanning(true);
    try {
      const result = await discoverProfiles();
      setProfiles(result.profiles);
      setWarnings(result.warnings);
    } catch (e) {
      await report(e);
    } finally {
      setScanning(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  if (error) return <ErrorView error={error} />;
  const save = (source: BookmarkSource) =>
    update((d) => {
      d.bookmarkSources = d.bookmarkSources.filter((s) => sourceId(s) !== sourceId(source));
      d.bookmarkSources.push(source);
    });
  const available = [...profiles];
  for (const selected of data.bookmarkSources)
    if (!available.some((p) => sourceId(p) === sourceId(selected)))
      available.push({ ...selected, name: `${selected.browser} · ${selected.profile} (unavailable)` });
  return (
    <List isLoading={loading || scanning} searchBarPlaceholder="Choose browsers and profiles…">
      <List.EmptyView
        title="No Supported Browser Profiles Found"
        description="Supported: Chrome, Brave, Edge, Vivaldi, and Chromium. Open a browser and create a profile, then refresh."
        actions={
          <ActionPanel>
            <Action title="Refresh Profiles" onAction={refresh} />
            <PreferencesAction />
          </ActionPanel>
        }
      />
      <List.Section title="Bookmark Sources" subtitle="Enter to enable or disable · choose folders in Actions">
        {available.map((profile) => {
          const selected = data.bookmarkSources.find((s) => sourceId(s) === sourceId(profile));
          return (
            <List.Item
              key={sourceId(profile)}
              title={profile.name}
              icon={selected ? Icon.CheckCircle : Icon.Circle}
              accessories={[
                {
                  text: selected
                    ? selected.folders.length
                      ? `${selected.folders.length} folder${selected.folders.length === 1 ? "" : "s"}`
                      : "All folders"
                    : "Not selected",
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title={selected ? "Disable Source" : "Enable Source"}
                    onAction={async () => {
                      try {
                        if (selected)
                          await update((d) => {
                            d.bookmarkSources = d.bookmarkSources.filter((s) => sourceId(s) !== sourceId(profile));
                          });
                        else await save({ browser: profile.browser, profile: profile.profile, folders: [] });
                      } catch (e) {
                        await report(e);
                      }
                    }}
                  />
                  <Action.Push
                    title="Choose Folders"
                    target={<FolderForm profile={profile} selected={selected ?? profile} onSave={save} />}
                  />
                  <Action title="Refresh Profiles" onAction={refresh} />
                  <PreferencesAction />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      {warnings.map((warning) => (
        <List.Item
          key={warning}
          title="Allow Browser Data Access"
          subtitle={warning}
          icon={Icon.Warning}
          actions={
            <ActionPanel>
              <Action.Push
                title="How to Allow Access"
                target={
                  <Detail
                    markdown={`# Allow Raycast to Read Browser Bookmarks\n\nmacOS blocked access to browser profile data.\n\nAllow Raycast's access to other apps' data when macOS asks. If you use **System Settings → Privacy & Security → Full Disk Access**, that permission grants Raycast broader file access, beyond these bookmarks. Choose whether to grant it yourself.\n\nAfter changing permission, quit and reopen Raycast, then use **Refresh Profiles**.\n\nDetails: ${warning}`}
                    actions={
                      <ActionPanel>
                        <Action.Open title="Open System Settings" target="/System/Applications/System Settings.app" />
                      </ActionPanel>
                    }
                  />
                }
              />
              <Action title="Retry" onAction={refresh} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
