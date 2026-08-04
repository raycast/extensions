import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  getSelectedFinderItems,
  getPreferenceValues,
  Icon,
  LaunchProps,
  open,
  openExtensionPreferences,
  popToRoot,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import {
  addObjectToSpaces,
  createObject,
  createObjectNote,
  isReadOnlyWriteError,
  listSpaces,
  listTags,
  uploadObjectFile,
} from "./api";
import { getAccessKeyScope, useEffectiveAccessLevel, useWriteAccess } from "./access-control";
import { ObjectDetail } from "./components/ObjectActions";
import { getBatchUploadFailureMessage } from "./error-utils";
import { getSpaceIcon } from "./helpers";
import {
  classifyClipboardContent,
  classifyFilePaths,
  classifyTextInput,
  getUnsupportedUploadFiles,
  SaveInput,
} from "./save-input";
import { isUserTag } from "./tag-utils";

type SaveValues = {
  kind: "url" | "note" | "file";
  existingTags: string[];
  files: string[];
  title?: string;
  url: string;
  content: string;
  spaceId: string;
};

type SaveLaunchContext = {
  content?: string;
  file?: string;
  files?: string[];
  url?: string;
};

type InitialState = {
  kind: SaveValues["kind"];
  content: string;
  files: string[];
  title: string;
  url: string;
};

const EMPTY_INITIAL_STATE: InitialState = {
  kind: "note",
  content: "",
  files: [],
  title: "",
  url: "",
};

function getInitialStateFromInput(input: SaveInput): InitialState | undefined {
  if (input.kind === "files") {
    return { ...EMPTY_INITIAL_STATE, kind: "file", files: input.value };
  }

  if (input.kind === "url") {
    return { ...EMPTY_INITIAL_STATE, kind: "url", url: input.value };
  }

  if (input.kind === "note") {
    return { ...EMPTY_INITIAL_STATE, kind: "note", content: input.value };
  }

  return undefined;
}

async function getClipboardInitialState(): Promise<InitialState | undefined> {
  for (let offset = 0; offset <= 5; offset++) {
    try {
      const initialState = getInitialStateFromInput(classifyClipboardContent(await Clipboard.read({ offset })));

      if (initialState) {
        return initialState;
      }
    } catch {
      // Continue through the available clipboard history when an item can't be read.
    }
  }

  return undefined;
}

async function resolveInitialState(fallbackText?: string, launchContext?: SaveLaunchContext): Promise<InitialState> {
  const launchContextFiles = classifyFilePaths([
    ...(Array.isArray(launchContext?.files) ? launchContext.files : []),
    ...(launchContext?.file ? [launchContext.file] : []),
  ]);

  if (launchContextFiles.kind === "files") {
    return { ...EMPTY_INITIAL_STATE, kind: "file", files: launchContextFiles.value };
  }

  if (launchContext?.url) {
    return { ...EMPTY_INITIAL_STATE, kind: "url", url: launchContext.url };
  }

  if (launchContext?.content) {
    return { ...EMPTY_INITIAL_STATE, kind: "note", content: launchContext.content };
  }

  const clipboardInitialState = await getClipboardInitialState();

  if (clipboardInitialState) {
    return clipboardInitialState;
  }

  try {
    const finderSelection = await getSelectedFinderItems();
    const selectedFiles = classifyFilePaths(finderSelection.map((item) => item.path));

    if (selectedFiles.kind === "files") {
      return { ...EMPTY_INITIAL_STATE, kind: "file", files: selectedFiles.value };
    }
  } catch {
    // Ignore missing Finder context and fall back to text detection.
  }

  const fallbackInput = classifyTextInput(fallbackText);

  if (fallbackInput.kind === "url") {
    return { ...EMPTY_INITIAL_STATE, kind: "url", url: fallbackInput.value };
  }

  if (fallbackInput.kind === "note") {
    return { ...EMPTY_INITIAL_STATE, kind: "note", content: fallbackInput.value };
  }

  return EMPTY_INITIAL_STATE;
}

export default function SaveToMymindCommand(props: LaunchProps) {
  const { push } = useNavigation();
  const { accessKeyId, accessKeySecret, accessLevel } = getPreferenceValues<Preferences>();
  const accessKeyScope = getAccessKeyScope(accessKeyId, accessKeySecret);
  const launchContext = useMemo(() => (props.launchContext ?? {}) as SaveLaunchContext, [props.launchContext]);
  const [kind, setKind] = useState<SaveValues["kind"]>("note");
  const [initialState, setInitialState] = useState<InitialState>(EMPTY_INITIAL_STATE);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const effectiveAccessLevel = useEffectiveAccessLevel(accessLevel, accessKeyScope);
  const canWrite = useWriteAccess(accessLevel, accessKeyScope);
  const { data: spaces = [], error: spacesError } = useCachedPromise(() => listSpaces(), [], {
    onError: (error) => {
      void showFailureToast(error, { title: "Couldn't load your spaces" });
    },
  });
  const { data: tags = [], error: tagsError } = useCachedPromise(() => listTags(), [], {
    onError: (error) => {
      void showFailureToast(error, { title: "Couldn't load your tags" });
    },
  });
  const manualTags = useMemo(
    () =>
      tags
        .filter(isUserTag)
        .map((tag) => tag.name)
        .filter(Boolean),
    [tags],
  );
  const formKey = useMemo(
    () =>
      JSON.stringify({
        content: initialState.content,
        files: initialState.files,
        kind: initialState.kind,
        title: initialState.title,
        url: initialState.url,
      }),
    [initialState.content, initialState.files, initialState.kind, initialState.title, initialState.url],
  );
  const unsupportedSelectedFiles = useMemo(() => getUnsupportedUploadFiles(selectedFiles), [selectedFiles]);

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
        setSelectedFiles(nextState.files);
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

  if (!canWrite) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            <Action.OpenInBrowser title="Open mymind Extensions" url="https://access.mymind.com/extensions" />
            <Action title="Open mymind" icon={Icon.Globe} onAction={() => open("https://access.mymind.com")} />
          </ActionPanel>
        }
      >
        <Form.Description
          text={
            accessLevel === "read-only"
              ? "This extension is set to Read Only. Change Access Level in extension preferences if this key can save and edit."
              : effectiveAccessLevel === "read-only"
                ? "This key appears to be read-only. Use a full-access key, or change Access Level in extension preferences."
                : "Saving is unavailable with the current access setup."
          }
        />
      </Form>
    );
  }

  async function handleSubmit(values: SaveValues) {
    const existingTags = values.existingTags ?? [];
    const title = values.title ?? "";
    const url = values.url ?? "";
    const content = values.content ?? "";
    const files = values.files ?? selectedFiles;
    const tagNames = Array.from(new Set(existingTags));
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    const spaceId = values.spaceId || undefined;

    if (kind === "url" && !url.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "URL is required" });
      return;
    }

    if (kind === "note" && !content.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Note content is required" });
      return;
    }

    if (kind === "file") {
      const supportedFiles = classifyFilePaths(files);

      if (supportedFiles.kind !== "files") {
        await showToast({ style: Toast.Style.Failure, title: "Choose at least one supported file" });
        return;
      }
    }

    setIsSubmitting(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Saving to mymind…" });

    try {
      if (kind === "file") {
        const supportedFiles = classifyFilePaths(files);

        if (supportedFiles.kind !== "files") {
          throw new Error("Choose at least one supported file.");
        }

        let createdCount = 0;
        let duplicateCount = 0;
        let failureCount = 0;
        let firstFailureMessage: string | undefined;
        let firstCreatedObjectId: string | undefined;

        for (const [index, filePath] of supportedFiles.value.entries()) {
          toast.message = `${index + 1} of ${supportedFiles.value.length}`;

          try {
            const result = await uploadObjectFile({
              filePath,
              tags: tagNames.length > 0 ? tagNames : undefined,
              spaceId,
            });

            if (spaceId && !result.object.spaces?.some((space) => space.id === spaceId)) {
              await addObjectToSpaces(result.object.id, [spaceId]);
            }

            if (trimmedContent) {
              await createObjectNote(result.object.id, trimmedContent);
            }

            if (result.created) {
              createdCount += 1;
              firstCreatedObjectId ??= result.object.id;
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
          toast.title = "Bulk upload finished with errors";
          toast.message = getBatchUploadFailureMessage({
            createdCount,
            duplicateCount,
            failureCount,
            firstFailureMessage,
          });
          return;
        }

        toast.style = Toast.Style.Success;
        toast.title = createdCount === 1 && duplicateCount === 0 ? "Saved to mymind" : "Files saved to mymind";
        toast.message =
          duplicateCount > 0
            ? `${createdCount} uploaded, ${duplicateCount} already existed`
            : `${createdCount} file${createdCount === 1 ? "" : "s"} uploaded`;

        if (supportedFiles.value.length === 1 && firstCreatedObjectId) {
          push(<ObjectDetail objectId={firstCreatedObjectId} />, () => {
            void popToRoot();
          });
        }

        return;
      }

      const result = await createObject({
        title: kind === "note" ? trimmedTitle || undefined : undefined,
        url: kind === "url" ? url.trim() : undefined,
        content: kind === "note" ? trimmedContent || undefined : undefined,
        tags: tagNames.length > 0 ? tagNames : undefined,
        spaceId,
      });

      let followUpError: string | undefined;

      try {
        if (spaceId && !result.object.spaces?.some((space) => space.id === spaceId)) {
          await addObjectToSpaces(result.object.id, [spaceId]);
        }

        if (kind === "url" && trimmedContent) {
          await createObjectNote(result.object.id, trimmedContent);
        }
      } catch (error) {
        followUpError = error instanceof Error ? error.message : String(error);
      }

      if (followUpError) {
        toast.style = Toast.Style.Failure;
        toast.title = "Saved to mymind, but couldn't finish setup";
        toast.message = followUpError;
        return;
      }

      toast.style = Toast.Style.Success;
      toast.title = result.created ? "Saved to mymind" : "Item already existed in mymind";
      toast.message = result.object.title?.trim() || "Untitled";

      if (result.created) {
        push(<ObjectDetail objectId={result.object.id} fallbackObject={result.object} />, () => {
          void popToRoot();
        });
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = isReadOnlyWriteError(error) ? "Key is read-only" : "Couldn't save to mymind";
      toast.message = error instanceof Error ? error.message : String(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      key={formKey}
      isLoading={isInitializing || isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save to mymind" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="kind" title="Type" value={kind} onChange={(value) => setKind(value as SaveValues["kind"])}>
        <Form.Dropdown.Item value="url" title="Link" />
        <Form.Dropdown.Item value="note" title="Note" />
        <Form.Dropdown.Item value="file" title="File" />
      </Form.Dropdown>
      {kind === "note" ? (
        <Form.TextField id="title" title="Title" placeholder="Optional title" defaultValue={initialState.title} />
      ) : null}
      {kind === "file" ? (
        <>
          <Form.FilePicker
            id="files"
            title="Files"
            value={selectedFiles}
            onChange={setSelectedFiles}
            allowMultipleSelection={true}
          />
          <Form.Description text="Choose one or more supported files. You can remove any file before uploading." />
          {unsupportedSelectedFiles.length > 0 ? (
            <Form.Description
              text={`Unsupported files will be skipped: ${unsupportedSelectedFiles
                .slice(0, 3)
                .map((filePath) => filePath.split(/[\\/]/).pop() ?? filePath)
                .join(", ")}${unsupportedSelectedFiles.length > 3 ? ", …" : ""}`}
            />
          ) : null}
          <Form.TextArea
            id="content"
            title="Note"
            placeholder="Optional note to attach to each uploaded file"
            defaultValue={initialState.content}
          />
        </>
      ) : null}
      {kind === "url" ? (
        <>
          <Form.TextField id="url" title="URL" placeholder="https://example.com" defaultValue={initialState.url} />
          <Form.TextArea id="content" title="Body" placeholder="Optional note" defaultValue={initialState.content} />
        </>
      ) : kind === "note" ? (
        <Form.TextArea
          id="content"
          title="Body"
          placeholder="Write your note here…"
          defaultValue={initialState.content}
        />
      ) : null}
      <Form.Dropdown id="spaceId" title="Space" storeValue={true}>
        <Form.Dropdown.Item value="" title="No Space" />
        {spaces.map((space) => (
          <Form.Dropdown.Item key={space.id} value={space.id} title={space.name} icon={getSpaceIcon(space)} />
        ))}
      </Form.Dropdown>
      {spacesError ? (
        <Form.Description text="Couldn't load your spaces. You can still save without choosing one." />
      ) : null}
      {manualTags.length > 0 ? (
        <Form.TagPicker id="existingTags" title="Tags" placeholder="Select your tags">
          {manualTags.map((tagName) => (
            <Form.TagPicker.Item key={tagName} value={tagName} title={tagName} />
          ))}
        </Form.TagPicker>
      ) : null}
      {tagsError ? <Form.Description text="Couldn't load your tags." /> : null}
    </Form>
  );
}
