import {
  Action,
  ActionPanel,
  Color,
  Form,
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
import { addObjectToSpaces, createObject, createObjectNote, isReadOnlyWriteError, listSpaces, listTags } from "./api";
import { useEffectiveAccessLevel, useWriteAccess } from "./access-control";
import { ObjectDetail } from "./components/ObjectActions";
import { classifyTextInput } from "./save-input";
import { isUserTag } from "./tag-utils";
import { Preferences, Space } from "./types";

type SaveValues = {
  kind: "url" | "note";
  existingTags: string[];
  title: string;
  url: string;
  content: string;
  spaceId: string;
};

type SaveLaunchContext = {
  content?: string;
  url?: string;
};

type InitialState = {
  kind: SaveValues["kind"];
  content: string;
  title: string;
  url: string;
};

const EMPTY_INITIAL_STATE: InitialState = {
  kind: "note",
  content: "",
  title: "",
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

async function resolveInitialState(fallbackText?: string, launchContext?: SaveLaunchContext): Promise<InitialState> {
  if (launchContext?.url) {
    return { ...EMPTY_INITIAL_STATE, kind: "url", url: launchContext.url };
  }

  if (launchContext?.content) {
    return { ...EMPTY_INITIAL_STATE, kind: "note", content: launchContext.content };
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
  const accessKeyScope = `${accessKeyId}:${accessKeySecret}`;
  const launchContext = useMemo(() => (props.launchContext ?? {}) as SaveLaunchContext, [props.launchContext]);
  const [kind, setKind] = useState<SaveValues["kind"]>("note");
  const [initialState, setInitialState] = useState<InitialState>(EMPTY_INITIAL_STATE);
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
        title: initialState.title,
        url: initialState.url,
      }),
    [initialState.content, initialState.title, initialState.url],
  );

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
            <Action.OpenInBrowser title="Open Mymind Extensions" url="https://access.mymind.com/extensions" />
            <Action title="Open Mymind" icon={Icon.Globe} onAction={() => open("https://access.mymind.com")} />
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
    const tagNames = Array.from(new Set(existingTags));
    const trimmedTitle = title.trim();
    const spaceId = values.spaceId || undefined;

    if (kind === "url" && !url.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "URL is required" });
      return;
    }

    if (kind === "note" && !content.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Note content is required" });
      return;
    }

    setIsSubmitting(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Saving to mymind…" });

    try {
      const trimmedContent = content.trim();
      const result = await createObject({
        title: kind === "note" ? trimmedTitle || undefined : undefined,
        url: kind === "url" ? url.trim() : undefined,
        content: kind === "note" ? trimmedContent || undefined : undefined,
        tags: tagNames.length > 0 ? tagNames : undefined,
        spaceId: kind === "note" ? spaceId : undefined,
      });

      if (spaceId && !result.object.spaces?.some((space) => space.id === spaceId)) {
        await addObjectToSpaces(result.object.id, [spaceId]);
      }

      if (kind === "url" && trimmedContent) {
        await createObjectNote(result.object.id, trimmedContent);
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
          <Action.SubmitForm title="Save to Mymind" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="kind" title="Type" value={kind} onChange={(value) => setKind(value as SaveValues["kind"])}>
        <Form.Dropdown.Item value="url" title="Link" />
        <Form.Dropdown.Item value="note" title="Note" />
      </Form.Dropdown>
      {kind === "note" ? (
        <Form.TextField id="title" title="Title" placeholder="Optional title" defaultValue={initialState.title} />
      ) : null}
      {kind === "url" ? (
        <>
          <Form.TextField id="url" title="URL" placeholder="https://example.com" defaultValue={initialState.url} />
          <Form.TextArea id="content" title="Body" placeholder="Optional note" defaultValue={initialState.content} />
        </>
      ) : (
        <Form.TextArea
          id="content"
          title="Body"
          placeholder="Write your note here…"
          defaultValue={initialState.content}
        />
      )}
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
