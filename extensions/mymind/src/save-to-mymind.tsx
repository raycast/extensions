import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Form,
  getSelectedFinderItems,
  Icon,
  LaunchProps,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { basename } from "path";
import { useEffect, useMemo, useState } from "react";
import { createObject, listSpaces, listTags, uploadObjectFile } from "./api";
import { splitCommaSeparated } from "./helpers";
import {
  classifyClipboardContent,
  classifyFilePaths,
  classifyTextInput,
  getUploadBaseTitle,
  getUnsupportedUploadFiles,
  SaveInput,
} from "./save-input";
import { isUserTag } from "./tag-utils";
import { Space } from "./types";

type SaveValues = {
  kind: "url" | "note";
  existingTags: string[];
  newTags: string;
  title: string;
  url: string;
  content: string;
  spaceId: string;
};

type SaveLaunchContext = {
  content?: string;
  files?: string[];
  url?: string;
};

type InitialState = {
  clipboardFiles: string[];
  kind: SaveValues["kind"];
  content: string;
  files: string[];
  title: string;
  unsupportedFiles: string[];
  url: string;
};

const EMPTY_INITIAL_STATE: InitialState = {
  clipboardFiles: [],
  kind: "note",
  content: "",
  files: [],
  title: "",
  unsupportedFiles: [],
  url: "",
};

function getSpaceIcon(space: Space) {
  return {
    source: Icon.Circle,
    tintColor: isSupportedColor(space.color) ? space.color : Color.SecondaryText,
  };
}

function isSupportedColor(value?: string): value is string {
  if (!value) {
    return false;
  }

  return /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(value.trim());
}

async function detectFinderInput(): Promise<SaveInput> {
  try {
    const items = await getSelectedFinderItems();
    return classifyFilePaths(items.map((item) => item.path));
  } catch {
    return { kind: "empty" };
  }
}

async function resolveInitialState(fallbackText?: string, launchContext?: SaveLaunchContext): Promise<InitialState> {
  if (launchContext?.files?.length) {
    const files = classifyFilePaths(launchContext.files);
    if (files.kind === "files") {
      return {
        ...EMPTY_INITIAL_STATE,
        files: files.value,
        title: files.value.length === 1 ? getUploadBaseTitle(files.value[0]) : "",
        unsupportedFiles: getUnsupportedUploadFiles(launchContext.files),
      };
    }
  }

  if (launchContext?.url) {
    return { ...EMPTY_INITIAL_STATE, kind: "url", url: launchContext.url };
  }

  if (launchContext?.content) {
    return { ...EMPTY_INITIAL_STATE, kind: "note", content: launchContext.content };
  }

  const finderInput = await detectFinderInput();
  if (finderInput.kind === "files") {
    return {
      ...EMPTY_INITIAL_STATE,
      files: finderInput.value,
      title: finderInput.value.length === 1 ? getUploadBaseTitle(finderInput.value[0]) : "",
    };
  }

  const clipboardContent = await Clipboard.read();
  const clipboardFiles = classifyFilePaths(clipboardContent.file ? [clipboardContent.file] : []);
  const clipboardInput = classifyClipboardContent(clipboardContent);

  if (clipboardInput.kind === "url") {
    return {
      ...EMPTY_INITIAL_STATE,
      clipboardFiles: clipboardFiles.kind === "files" ? clipboardFiles.value : [],
      kind: "url",
      url: clipboardInput.value,
    };
  }

  if (clipboardInput.kind === "note") {
    return {
      ...EMPTY_INITIAL_STATE,
      clipboardFiles: clipboardFiles.kind === "files" ? clipboardFiles.value : [],
      kind: "note",
      content: clipboardInput.value,
    };
  }

  const fallbackInput = classifyTextInput(fallbackText);
  if (fallbackInput.kind === "url") {
    return {
      ...EMPTY_INITIAL_STATE,
      clipboardFiles: clipboardFiles.kind === "files" ? clipboardFiles.value : [],
      kind: "url",
      url: fallbackInput.value,
    };
  }

  if (fallbackInput.kind === "note") {
    return {
      ...EMPTY_INITIAL_STATE,
      clipboardFiles: clipboardFiles.kind === "files" ? clipboardFiles.value : [],
      kind: "note",
      content: fallbackInput.value,
    };
  }

  return {
    ...EMPTY_INITIAL_STATE,
    clipboardFiles: clipboardFiles.kind === "files" ? clipboardFiles.value : [],
  };
}

function describeFiles(filePaths: string[]): string {
  if (filePaths.length === 1) {
    return `Detected file: ${basename(filePaths[0])}`;
  }

  return `Detected ${filePaths.length} files:\n${filePaths.map((filePath) => `• ${basename(filePath)}`).join("\n")}`;
}

export default function SaveToMymindCommand(props: LaunchProps) {
  const launchContext = (props.launchContext ?? {}) as SaveLaunchContext;
  const [kind, setKind] = useState<SaveValues["kind"]>("note");
  const [initialState, setInitialState] = useState<InitialState>(EMPTY_INITIAL_STATE);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: spaces = [] } = useCachedPromise(() => listSpaces(), []);
  const { data: tags = [] } = useCachedPromise(() => listTags(), []);
  const manualTags = useMemo(
    () =>
      tags
        .filter(isUserTag)
        .map((tag) => tag.name)
        .filter(Boolean),
    [tags],
  );
  const isUploadMode = initialState.files.length > 0;
  const initialFormKey = useMemo(
    () =>
      JSON.stringify({
        kind,
        content: initialState.content,
        files: initialState.files,
        title: initialState.title,
        url: initialState.url,
      }),
    [initialState.content, initialState.files, initialState.title, initialState.url, kind],
  );

  function useClipboardFiles() {
    if (initialState.clipboardFiles.length === 0) {
      return;
    }

    setInitialState((currentState) => ({
      ...currentState,
      clipboardFiles: [],
      files: currentState.clipboardFiles,
    }));
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitialState() {
      try {
        const nextState = await resolveInitialState(props.fallbackText, launchContext);

        if (cancelled) {
          return;
        }

        setInitialState(nextState);
        setKind(nextState.kind);

        if (nextState.unsupportedFiles.length > 0) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Some files can't be uploaded",
            message: nextState.unsupportedFiles.map((filePath) => basename(filePath)).join(", "),
          });
        }
      } finally {
        if (!cancelled) {
          setIsInitializing(false);
        }
      }
    }

    void loadInitialState();

    return () => {
      cancelled = true;
    };
  }, [launchContext, props.fallbackText]);

  async function handleSubmit(values: SaveValues) {
    const tagNames = Array.from(new Set([...values.existingTags, ...splitCommaSeparated(values.newTags)]));
    const trimmedTitle = values.title.trim();
    const spaceId = values.spaceId || undefined;

    if (isUploadMode) {
      setIsSubmitting(true);
      const toast = await showToast({ style: Toast.Style.Animated, title: "Uploading to mymind…" });
      let createdCount = 0;
      let duplicateCount = 0;
      let failureCount = 0;
      let firstFailureMessage: string | undefined;

      try {
        for (const [index, filePath] of initialState.files.entries()) {
          toast.message = `${index + 1} of ${initialState.files.length}: ${basename(filePath)}`;

          try {
            const result = await uploadObjectFile({
              filePath,
              title: initialState.files.length === 1 ? trimmedTitle || undefined : undefined,
              tags: tagNames,
              spaceId,
            });

            if (result.created) {
              createdCount += 1;
            } else {
              duplicateCount += 1;
            }
          } catch (error) {
            failureCount += 1;
            firstFailureMessage ??= error instanceof Error ? error.message : String(error);
          }
        }

        if (failureCount > 0) {
          toast.style = Toast.Style.Failure;
          toast.title = "Some files couldn't be uploaded";
          toast.message = firstFailureMessage ?? `${failureCount} upload(s) failed`;
          return;
        }

        toast.style = Toast.Style.Success;
        toast.title = initialState.files.length === 1 ? "Uploaded to mymind" : "Uploaded files to mymind";
        toast.message =
          duplicateCount > 0 ? `${createdCount} new, ${duplicateCount} already existed` : `${createdCount} file(s) uploaded`;
      } finally {
        setIsSubmitting(false);
      }

      return;
    }

    if (kind === "url" && !values.url.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "URL is required" });
      return;
    }

    if (kind === "note" && !values.content.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Note content is required" });
      return;
    }

    setIsSubmitting(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Saving to mymind…" });

    try {
      const result = await createObject({
        title: trimmedTitle || undefined,
        url: kind === "url" ? values.url.trim() : undefined,
        content: kind === "note" ? values.content.trim() : undefined,
        tags: tagNames,
        spaceId,
      });

      toast.style = Toast.Style.Success;
      toast.title = result.created ? "Saved to mymind" : "Item already existed in mymind";
      toast.message = result.object.title?.trim() || "Untitled";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't save to mymind";
      toast.message = error instanceof Error ? error.message : String(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      key={initialFormKey}
      isLoading={isInitializing || isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={isUploadMode ? "Upload to Mymind" : "Save to Mymind"} onSubmit={handleSubmit} />
          {!isUploadMode && initialState.clipboardFiles.length > 0 ? (
            <Action
              title={
                initialState.clipboardFiles.length === 1
                  ? `Use Clipboard File: ${basename(initialState.clipboardFiles[0])}`
                  : `Use ${initialState.clipboardFiles.length} Clipboard Files`
              }
              onAction={useClipboardFiles}
            />
          ) : null}
        </ActionPanel>
      }
    >
      {!isUploadMode ? (
        <Form.Dropdown id="kind" title="Type" value={kind} onChange={(value) => setKind(value as SaveValues["kind"])}>
          <Form.Dropdown.Item value="url" title="Link" />
          <Form.Dropdown.Item value="note" title="Note" />
        </Form.Dropdown>
      ) : (
        <Form.Description text={describeFiles(initialState.files)} />
      )}
      {(!isUploadMode || initialState.files.length === 1) && (
        <Form.TextField
          id="title"
          title="Title"
          placeholder="Optional title"
          defaultValue={initialState.title}
        />
      )}
      {!isUploadMode ? (
        kind === "url" ? (
          <Form.TextField id="url" title="URL" placeholder="https://example.com" defaultValue={initialState.url} />
        ) : (
          <Form.TextArea
            id="content"
            title="Body"
            placeholder="Write your note here…"
            defaultValue={initialState.content}
          />
        )
      ) : null}
      <Form.Dropdown id="spaceId" title="Space" storeValue={true}>
        <Form.Dropdown.Item value="" title="No Space" />
        {spaces.map((space) => (
          <Form.Dropdown.Item key={space.id} value={space.id} title={space.name} icon={getSpaceIcon(space)} />
        ))}
      </Form.Dropdown>
      {manualTags.length > 0 ? (
        <Form.TagPicker id="existingTags" title="Tags" placeholder="Select your tags">
          {manualTags.map((tagName) => (
            <Form.TagPicker.Item key={tagName} value={tagName} title={tagName} />
          ))}
        </Form.TagPicker>
      ) : null}
      <Form.TextField id="newTags" title="New Tags" placeholder="Comma-separated tags" />
    </Form>
  );
}
