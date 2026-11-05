import { Action, ActionPanel, Form, Icon, type LaunchProps, showToast, Toast, useNavigation } from "@raycast/api";
import { createDeeplink } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { toError } from "./api/problems";
import { CaptureProgress } from "./components/capture-progress";
import { failToast } from "./components/problem";
import { enqueue, findUrl, savedTitle, type UrlOrigin } from "./lib/capture";
import { useLookups } from "./lib/library";
import { cleanTags, parseTags, parseWebUrl } from "./lib/urls";

interface SaveUrlArguments {
  url?: string;
}

interface SaveUrlContext {
  tags?: string[];
  folderId?: string;
}

interface SaveUrlValues {
  url: string;
  tags: string[];
  newTags: string;
  folderId: string;
}

const NO_FOLDER = "";
const TAG_CHOICES = 300;

const ORIGINS = {
  selection: "From your selection.",
  browser: "From the page open in your browser.",
  clipboard: "From your clipboard.",
} satisfies Record<UrlOrigin, string>;

export default function Command(
  props: LaunchProps<{ arguments: SaveUrlArguments; draftValues: SaveUrlValues; launchContext: SaveUrlContext }>,
) {
  const { push } = useNavigation();
  const lookups = useLookups();
  const draft = props.draftValues;
  const context = props.launchContext;
  const [url, setUrl] = useState(props.arguments.url?.trim() || draft?.url || "");
  const [origin, setOrigin] = useState<UrlOrigin | null>(null);
  const [urlError, setUrlError] = useState<string>();
  const [tags, setTags] = useState<string[]>(draft?.tags ?? context?.tags ?? []);
  const [newTags, setNewTags] = useState(draft?.newTags ?? "");
  const [folderId, setFolderId] = useState(draft?.folderId ?? context?.folderId ?? NO_FOLDER);
  const [finding, setFinding] = useState(!url);
  const edited = useRef(Boolean(url));

  useEffect(() => {
    if (edited.current) return;
    void findUrl()
      .then((found) => {
        if (!found || edited.current) return;
        setUrl(found.url);
        setOrigin(found.origin);
      })
      .finally(() => setFinding(false));
  }, []);

  const choices = [
    ...new Set([
      ...tags,
      ...[...lookups.tags]
        .sort((a, b) => Number(b.starred) - Number(a.starred) || b.count - a.count)
        .slice(0, TAG_CHOICES)
        .map((tag) => tag.name),
    ]),
  ];

  function allTags(): string[] {
    return cleanTags([...tags, ...parseTags(newTags)]);
  }

  async function submit() {
    const target = parseWebUrl(url);
    if (!target) return setUrlError("Enter a full web address that starts with http:// or https://.");
    const toast = await showToast({ style: Toast.Style.Animated, title: "Saving to Pond" });
    try {
      const options = { tags: allTags(), folderId: folderId || undefined };
      const result = await enqueue(target, options);
      const title = savedTitle(result, options);
      await toast.hide();
      push(<CaptureProgress result={result} url={target} title={title} />);
    } catch (error) {
      failToast(toast, toError(error), "Couldn't save the URL");
    }
  }

  const quicklinkTags = (() => {
    try {
      return allTags();
    } catch {
      return tags;
    }
  })();

  return (
    <Form
      isLoading={finding}
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save to Pond" icon={Icon.SaveDocument} onSubmit={submit} />
          <Action.CreateQuicklink
            title="Create Quicklink with These Tags"
            quicklink={{
              name: quicklinkTags.length ? `Save to Pond as ${quicklinkTags.join(", ")}` : "Save to Pond",
              link: createDeeplink({
                command: "quick-save",
                arguments: { tags: quicklinkTags.join(", ") },
                context: { folderId: folderId || undefined },
              }),
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://"
        value={url}
        error={urlError}
        info={origin ? ORIGINS[origin] : undefined}
        onChange={(value) => {
          edited.current = true;
          setUrl(value);
          setOrigin(null);
          setUrlError(undefined);
        }}
        onBlur={(event) => {
          const value = event.target.value?.trim();
          if (value && !parseWebUrl(value))
            setUrlError("Enter a full web address that starts with http:// or https://.");
        }}
      />
      <Form.TagPicker id="tags" title="Tags" value={tags} onChange={setTags} placeholder="Pick tags">
        {choices.map((tag) => (
          <Form.TagPicker.Item key={tag} value={tag} title={tag} icon={Icon.Tag} />
        ))}
      </Form.TagPicker>
      <Form.TextField
        id="newTags"
        title="New Tags"
        placeholder="design, reference"
        info="Separate tags with commas."
        value={newTags}
        onChange={setNewTags}
      />
      <Form.Dropdown id="folderId" title="Folder" value={folderId} onChange={setFolderId}>
        <Form.Dropdown.Item value={NO_FOLDER} title="No Folder" icon={Icon.Tray} />
        {folderId && !lookups.folderById.has(folderId) && (
          <Form.Dropdown.Item value={folderId} title="Folder" icon={Icon.Folder} />
        )}
        {lookups.folders.map((folder) => (
          <Form.Dropdown.Item
            key={folder.id}
            value={folder.id}
            title={folder.path}
            icon={{ source: Icon.Folder, tintColor: folder.color ?? undefined }}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
