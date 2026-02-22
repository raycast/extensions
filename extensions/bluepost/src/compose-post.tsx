import {
  Action,
  ActionPanel,
  Clipboard,
  confirmAlert,
  Detail,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  popToRoot,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { getMastodonAccounts, type MastodonAccount } from "./lib/accounts";
import {
  getDrafts,
  saveDraft,
  updateDraft,
  removeDraft,
  type Draft,
} from "./lib/drafts";
import { countGraphemes } from "./lib/graphemes";
import { postToAll } from "./lib/posting";

const GRAPHEME_LIMIT = 300;

async function detectUrl(): Promise<string> {
  try {
    const clip = await Clipboard.readText();
    if (clip && isUrl(clip.trim())) return clip.trim();
  } catch {
    // clipboard unavailable
  }
  return "";
}

// --- Router ---

export default function ComposePost() {
  const { data: drafts, isLoading, revalidate } = usePromise(getDrafts);

  if (isLoading) return <List isLoading />;

  if (drafts && drafts.length > 0) {
    return <DraftsList drafts={drafts} onDraftChange={revalidate} />;
  }

  return <ComposeForm onDraftChange={revalidate} />;
}

// --- Drafts List ---

function DraftsList({
  drafts,
  onDraftChange,
}: {
  drafts: Draft[];
  onDraftChange: () => void;
}) {
  const { push } = useNavigation();

  function draftTitle(draft: Draft): string {
    const preview = draft.text || draft.url || "(empty)";
    return preview.length > 60 ? preview.slice(0, 57) + "..." : preview;
  }

  function draftDetail(draft: Draft): string {
    const parts: string[] = [];
    if (draft.text) parts.push(draft.text);
    if (draft.url) parts.push(`\n\n🔗 ${draft.url}`);
    if (draft.images.length > 0) {
      parts.push(
        "\n\n" +
          draft.images
            .map((img) =>
              /\.(jpe?g|png|gif|webp|bmp|tiff?)$/i.test(img)
                ? `![](${img})`
                : `📎 ${img.split("/").pop()}`,
            )
            .join("\n"),
      );
    }
    parts.push(
      `\n\n---\n*Updated ${new Date(draft.updatedAt).toLocaleString()}*`,
    );
    return parts.join("");
  }

  async function handleDelete(draft: Draft) {
    if (
      await confirmAlert({
        title: "Delete Draft?",
        message: `"${draftTitle(draft)}" will be permanently removed.`,
      })
    ) {
      await removeDraft(draft.id);
      onDraftChange();
      await showToast({ style: Toast.Style.Success, title: "Draft deleted" });
    }
  }

  return (
    <List isShowingDetail navigationTitle="Drafts">
      {drafts.map((draft) => (
        <List.Item
          key={draft.id}
          title={draftTitle(draft)}
          accessories={[{ date: new Date(draft.updatedAt) }]}
          detail={<List.Item.Detail markdown={draftDetail(draft)} />}
          actions={
            <ActionPanel>
              <Action
                title="Resume Editing"
                icon={Icon.Pencil}
                onAction={() =>
                  push(
                    <ComposeForm draft={draft} onDraftChange={onDraftChange} />,
                  )
                }
              />
              <Action
                title="New Post"
                icon={Icon.PlusCircle}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={() =>
                  push(<ComposeForm onDraftChange={onDraftChange} />)
                }
              />
              <Action
                title="Delete Draft"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => handleDelete(draft)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

// --- Compose Form ---

function ComposeForm({
  draft,
  onDraftChange,
}: {
  draft?: Draft;
  onDraftChange: () => void;
}) {
  const { data: mastoAccounts, isLoading: loadingAccounts } =
    usePromise(getMastodonAccounts);
  const { data: detectedUrl = "", isLoading: loadingUrl } =
    usePromise(detectUrl);
  const isLoading = loadingAccounts || loadingUrl;
  const [text, setText] = useState(draft?.text ?? "");
  const [url, setUrl] = useState(draft?.url ?? "");
  const [urlSeeded, setUrlSeeded] = useState(!!draft);
  const [currentImages, setCurrentImages] = useState<string[]>(
    draft?.images ?? [],
  );
  const [draftId, setDraftId] = useState<string | undefined>(draft?.id);
  const { push } = useNavigation();

  // Refs for auto-save on unmount (ESC / back navigation)
  const textRef = useRef(text);
  const urlRef = useRef(url);
  const imagesRef = useRef(currentImages);
  const draftIdRef = useRef(draftId);
  const submittedRef = useRef(false);
  textRef.current = text;
  urlRef.current = url;
  imagesRef.current = currentImages;
  draftIdRef.current = draftId;

  useEffect(() => {
    return () => {
      if (submittedRef.current) return;
      const t = textRef.current.trim();
      const u = urlRef.current.trim();
      const imgs = imagesRef.current;
      if (!t && !u && imgs.length === 0) return;
      const fields = {
        text: textRef.current,
        url: urlRef.current,
        images: imgs,
      };
      if (draftIdRef.current) {
        void updateDraft(draftIdRef.current, fields).then(onDraftChange);
      } else {
        void saveDraft(fields).then(onDraftChange);
      }
    };
  }, []);

  if (!urlSeeded && !loadingUrl && detectedUrl) {
    setUrl(detectedUrl);
    setUrlSeeded(true);
  }

  const graphemeCount = countGraphemes(text);
  const hasMastodon = (mastoAccounts?.length ?? 0) > 0;

  async function handleSaveDraft() {
    if (!text.trim() && !url.trim() && currentImages.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Nothing to save",
        message: "Add text, a URL, or images first",
      });
      return;
    }
    const fields = { text, url, images: currentImages };
    if (draftId) {
      await updateDraft(draftId, fields);
    } else {
      const created = await saveDraft(fields);
      setDraftId(created.id);
    }
    onDraftChange();
    await showToast({ style: Toast.Style.Success, title: "Draft saved" });
  }

  async function handleSubmit(values: {
    text: string;
    url: string;
    images: string[];
    [key: string]: string | string[] | boolean;
  }) {
    if (!values.text.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Post text is required",
      });
      return;
    }

    if (countGraphemes(values.text) > GRAPHEME_LIMIT) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Post exceeds 300 grapheme limit",
      });
      return;
    }

    const selectedMasto =
      mastoAccounts?.filter((a) => values[`masto_${a.id}`] !== false) ?? [];

    submittedRef.current = true;
    push(
      <PostPreview
        text={values.text}
        url={values.url || undefined}
        images={values.images?.length > 0 ? values.images : undefined}
        mastodonAccounts={selectedMasto}
        draftId={draftId}
        onDraftChange={onDraftChange}
      />,
    );
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Post (${graphemeCount}/${GRAPHEME_LIMIT})`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Post" onSubmit={handleSubmit} />
          <Action
            title="Save Draft"
            icon={Icon.Document}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onAction={handleSaveDraft}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title={`Post (${graphemeCount}/${GRAPHEME_LIMIT})`}
        placeholder="What's on your mind?"
        value={text}
        onChange={setText}
        error={
          graphemeCount > GRAPHEME_LIMIT
            ? `${graphemeCount - GRAPHEME_LIMIT} graphemes over limit`
            : undefined
        }
      />
      <Form.TextField
        id="url"
        title="Link URL"
        placeholder="https://example.com (optional)"
        value={url}
        onChange={setUrl}
      />
      <Form.FilePicker
        id="images"
        title="Attachments"
        allowMultipleSelection
        canChooseDirectories={false}
        value={currentImages}
        onChange={setCurrentImages}
      />

      {hasMastodon && (
        <>
          <Form.Separator />
          {mastoAccounts?.map((account, i) => (
            <Form.Checkbox
              key={account.id}
              id={`masto_${account.id}`}
              title={i === 0 ? "Mastodon" : ""}
              label={
                account.handle
                  ? `@${account.handle}@${account.instance}`
                  : account.instance
              }
              defaultValue={true}
            />
          ))}
        </>
      )}
    </Form>
  );
}

// --- Post Preview ---

function PostPreview({
  text,
  url,
  images,
  mastodonAccounts,
  draftId,
  onDraftChange,
}: {
  text: string;
  url?: string;
  images?: string[];
  mastodonAccounts: MastodonAccount[];
  draftId?: string;
  onDraftChange: () => void;
}) {
  const targets =
    mastodonAccounts.length > 0
      ? `Bluesky + ${mastodonAccounts.length} Mastodon`
      : "Bluesky only";

  const markdown = [
    text,
    url ? `\n\n🔗 ${url}` : "",
    images && images.length > 0
      ? "\n\n" +
        images
          .map((img) =>
            /\.(jpe?g|png|gif|webp|bmp|tiff?)$/i.test(img)
              ? `![](${img})`
              : `📎 ${img.split("/").pop()}`,
          )
          .join("\n")
      : "",
  ].join("");

  async function handleConfirm() {
    await showToast({ style: Toast.Style.Animated, title: "Posting..." });
    await postToAll({ text, url, images, mastodonAccounts });
    if (draftId) {
      await removeDraft(draftId);
      onDraftChange();
    }
    popToRoot();
  }

  return (
    <Detail
      navigationTitle="Review Post"
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Targets" text={targets} />
          {mastodonAccounts.map((a) => (
            <Detail.Metadata.Label
              key={a.id}
              title=""
              text={a.handle ? `@${a.handle}@${a.instance}` : a.instance}
            />
          ))}
          {images && images.length > 0 && (
            <Detail.Metadata.Label
              title="Images"
              text={`${images.length} file(s)`}
            />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Confirm Post" onAction={handleConfirm} />
        </ActionPanel>
      }
    />
  );
}

function isUrl(text: string): boolean {
  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
