import { Action, ActionPanel, Form, Icon, type LaunchProps, showToast, Toast, useNavigation } from "@raycast/api";
import { createDeeplink, useForm } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { toError } from "./api/problems";
import { CaptureProgress } from "./components/capture-progress";
import { showFailure } from "./components/problem";
import { enqueue, findUrl, savedTitle, type UrlOrigin } from "./lib/capture";
import { useLookups } from "./lib/library";
import { cleanTags, parseTags, parseWebUrl } from "./lib/urls";

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
  props: LaunchProps<{ arguments: Arguments.SaveUrl; draftValues: SaveUrlValues; launchContext: SaveUrlContext }>,
) {
  const { push } = useNavigation();
  const lookups = useLookups();
  const draft = props.draftValues;
  const context = props.launchContext;
  const initialUrl = props.arguments.url?.trim() || draft?.url || "";
  const [origin, setOrigin] = useState<UrlOrigin | null>(null);
  const [finding, setFinding] = useState(!initialUrl);
  const edited = useRef(Boolean(initialUrl));
  const pending = useRef(false);
  const { handleSubmit, itemProps, values, setValue } = useForm<SaveUrlValues>({
    initialValues: {
      url: initialUrl,
      tags: draft?.tags ?? context?.tags ?? [],
      newTags: draft?.newTags ?? "",
      folderId: draft?.folderId ?? context?.folderId ?? NO_FOLDER,
    },
    validation: {
      url: (value) =>
        parseWebUrl(value) ? undefined : "Enter a full web address that starts with http:// or https://.",
      newTags: (value) => {
        try {
          cleanTags([...values.tags, ...parseTags(value)]);
        } catch (error) {
          return toError(error).message;
        }
      },
    },
    onSubmit: submit,
  });
  const { tags, newTags, folderId } = values;

  useEffect(() => {
    if (edited.current) return;
    void findUrl()
      .then((found) => {
        if (!found || edited.current) return;
        setValue("url", found.url);
        setOrigin(found.origin);
      })
      .finally(() => setFinding(false));
  }, [setValue]);

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

  async function submit(submitted: SaveUrlValues) {
    if (pending.current) return false;
    const target = parseWebUrl(submitted.url);
    if (!target) return false;
    pending.current = true;
    try {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Saving to Pond" });
      const options = {
        tags: cleanTags([...submitted.tags, ...parseTags(submitted.newTags)]),
        folderId: submitted.folderId || undefined,
      };
      const result = await enqueue(target, options);
      const title = savedTitle(result, options);
      await toast.hide();
      push(<CaptureProgress result={result} url={target} title={title} />);
    } catch (error) {
      await showFailure(toError(error), "Couldn't save the URL");
      return false;
    } finally {
      pending.current = false;
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
          <Action.SubmitForm title="Save to Pond" icon={Icon.SaveDocument} onSubmit={handleSubmit} />
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
        {...itemProps.url}
        title="URL"
        placeholder="https://"
        info={origin ? ORIGINS[origin] : undefined}
        onChange={(value) => {
          edited.current = true;
          itemProps.url.onChange?.(value);
          setOrigin(null);
        }}
      />
      <Form.TagPicker {...itemProps.tags} title="Tags" placeholder="Pick tags">
        {choices.map((tag) => (
          <Form.TagPicker.Item key={tag} value={tag} title={tag} icon={Icon.Tag} />
        ))}
      </Form.TagPicker>
      <Form.TextField
        {...itemProps.newTags}
        title="New Tags"
        placeholder="design, reference"
        info="Separate tags with commas."
      />
      <Form.Dropdown {...itemProps.folderId} title="Folder">
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
