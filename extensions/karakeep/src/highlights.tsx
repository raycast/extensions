import { Action, ActionPanel, confirmAlert, Detail, Form, Icon, List, useNavigation } from "@raycast/api";
import { useCachedPromise, useForm } from "@raycast/utils";
import { logger } from "@chrismessina/raycast-logger";
import { fetchDeleteHighlight, fetchGetAllHighlights, fetchGetSingleBookmark, fetchUpdateHighlight } from "./apis";
import { BookmarkDetail } from "./components/BookmarkDetail";
import { useTranslation } from "./hooks/useTranslation";
import { Highlight } from "./types";
import { runWithToast } from "./utils/toast";

const log = logger.child("[Highlights]");

function OpenBookmarkAction({ bookmarkId, t }: { bookmarkId: string; t: (key: string) => string }) {
  const { push } = useNavigation();
  return (
    <Action
      title={t("highlights.actions.openBookmark")}
      icon={Icon.Bookmark}
      onAction={async () => {
        log.log("Fetching bookmark for highlight", { bookmarkId });
        const bookmark = await fetchGetSingleBookmark(bookmarkId);
        log.info("Opening bookmark from highlight", { bookmarkId });
        push(<BookmarkDetail bookmark={bookmark} />);
      }}
    />
  );
}

async function deleteHighlight(id: string, t: (key: string) => string, onSuccess: () => void) {
  if (
    await confirmAlert({
      title: t("highlights.deleteHighlight"),
      message: t("highlights.deleteConfirm"),
    })
  ) {
    log.info("Deleting highlight", { highlightId: id });
    await runWithToast({
      loading: { title: t("highlights.toast.delete.loading") },
      success: { title: t("highlights.toast.delete.success") },
      failure: { title: t("highlights.toast.delete.error") },
      action: async () => {
        await fetchDeleteHighlight(id);
        onSuccess();
        log.info("Highlight deleted", { highlightId: id });
      },
    });
  }
}

function useGetAllHighlights() {
  const { isLoading, data, error, revalidate } = useCachedPromise(async () => {
    log.log("Fetching highlights");
    const result = await fetchGetAllHighlights();
    log.info("Highlights fetched", { count: result.highlights?.length ?? 0 });
    return result.highlights || [];
  });

  return { isLoading, highlights: data || [], error, revalidate };
}

function EditHighlightForm({ highlight, onUpdated }: { highlight: Highlight; onUpdated: () => void }) {
  const { pop } = useNavigation();
  const { t } = useTranslation();

  const { handleSubmit, itemProps } = useForm<
    Pick<{ text: string; note: string; color: string }, "text" | "note" | "color">
  >({
    initialValues: { text: highlight.text, note: highlight.note || "", color: highlight.color || "" },
    validation: {
      text: (v) => (!v?.trim() ? t("highlights.highlightText") + " is required" : undefined),
    },
    async onSubmit(values) {
      log.info("Updating highlight", { highlightId: highlight.id });
      const result = await runWithToast({
        loading: { title: t("highlights.toast.update.loading") },
        success: { title: t("highlights.toast.update.success") },
        failure: { title: t("highlights.toast.update.error") },
        action: async () => {
          await fetchUpdateHighlight(highlight.id, {
            text: values.text.trim(),
            note: values.note.trim() || undefined,
            color: values.color.trim() || undefined,
          });
          onUpdated();
          log.info("Highlight updated", { highlightId: highlight.id });
        },
      });
      if (result !== undefined) pop();
    },
  });

  return (
    <Form
      navigationTitle={t("highlights.editHighlight")}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t("highlights.editHighlight")} onSubmit={handleSubmit} icon={Icon.Pencil} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        {...itemProps.text}
        title={t("highlights.highlightText")}
        placeholder={t("highlights.highlightTextPlaceholder")}
        autoFocus
      />
      <Form.TextField {...itemProps.note} title={t("highlights.note")} placeholder={t("highlights.notePlaceholder")} />
      <Form.TextField
        {...itemProps.color}
        title={t("highlights.color")}
        placeholder={t("highlights.colorPlaceholder")}
      />
    </Form>
  );
}

function HighlightDetail({ highlight, onRefresh }: { highlight: Highlight; onRefresh: () => void }) {
  const { pop, push } = useNavigation();
  const { t } = useTranslation();

  const handleDelete = () =>
    deleteHighlight(highlight.id, t, () => {
      onRefresh();
      pop();
    });

  const markdown = [
    `### ${highlight.text}`,
    highlight.note ? `\n**Note:** ${highlight.note}` : "",
    highlight.color ? `\n**Color:** ${highlight.color}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <Detail
      markdown={markdown}
      navigationTitle={t("highlights.title")}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title={t("highlights.metadata.bookmarkId")} text={highlight.bookmarkId} />
          <Detail.Metadata.Separator />
          {highlight.note && (
            <>
              <Detail.Metadata.Label title={t("highlights.metadata.note")} text={highlight.note} />
              <Detail.Metadata.Separator />
            </>
          )}
          {highlight.color && (
            <>
              <Detail.Metadata.Label title={t("highlights.metadata.color")} text={highlight.color} />
              <Detail.Metadata.Separator />
            </>
          )}
          {highlight.createdAt && (
            <Detail.Metadata.Label
              title={t("highlights.metadata.createdAt")}
              text={new Date(highlight.createdAt).toLocaleString()}
            />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenBookmarkAction bookmarkId={highlight.bookmarkId} t={t} />
            <Action.CopyToClipboard
              content={highlight.text}
              title={t("highlights.actions.copyText")}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            {highlight.note && (
              <Action.CopyToClipboard
                content={highlight.note}
                title={t("highlights.actions.copyNote")}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title={t("highlights.actions.edit")}
              icon={Icon.Pencil}
              onAction={() => push(<EditHighlightForm highlight={highlight} onUpdated={onRefresh} />)}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
            />
            <Action
              title={t("highlights.actions.delete")}
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={handleDelete}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function Highlights() {
  const { push } = useNavigation();
  const { t } = useTranslation();
  const { isLoading, highlights, revalidate } = useGetAllHighlights();

  return (
    <List isLoading={isLoading} searchBarPlaceholder={t("highlights.searchPlaceholder")}>
      {!isLoading && highlights.length === 0 && (
        <List.EmptyView
          title={t("highlights.empty.title")}
          description={t("highlights.empty.description")}
          icon={Icon.Highlight}
        />
      )}
      {highlights.map((highlight) => (
        <List.Item
          key={highlight.id}
          icon={Icon.Highlight}
          title={highlight.text.slice(0, 80)}
          subtitle={highlight.note}
          accessories={highlight.color ? [{ text: highlight.color }] : []}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action
                  title={t("bookmarkItem.actions.viewDetail")}
                  icon={Icon.Sidebar}
                  onAction={() => push(<HighlightDetail highlight={highlight} onRefresh={revalidate} />)}
                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                />
                <OpenBookmarkAction bookmarkId={highlight.bookmarkId} t={t} />
                <Action
                  title={t("highlights.actions.edit")}
                  icon={Icon.Pencil}
                  onAction={() => push(<EditHighlightForm highlight={highlight} onUpdated={revalidate} />)}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.CopyToClipboard
                  content={highlight.text}
                  title={t("highlights.actions.copyText")}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                {highlight.note && (
                  <Action.CopyToClipboard
                    content={highlight.note}
                    title={t("highlights.actions.copyNote")}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                )}
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title={t("highlights.actions.delete")}
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => deleteHighlight(highlight.id, t, revalidate)}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
