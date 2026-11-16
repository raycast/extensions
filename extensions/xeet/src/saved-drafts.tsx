import { Action, ActionPanel, Alert, confirmAlert, Icon, List, useNavigation, Keyboard } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useState } from "react";
import { deleteDraft, listDrafts, loadDraft } from "./lib/storage";
import { renderPost } from "./lib/renderer";
import PostForm from "./components/post-form";
import PostPreview from "./components/post-preview";
import VariantGrid from "./components/variant-grid";

export default function Command() {
  const { data: drafts, isLoading, revalidate } = usePromise(listDrafts);
  const [busy, setBusy] = useState(false);
  const { push } = useNavigation();
  async function open(id: string, mode: "preview" | "edit" | "compare") {
    if (busy) return;
    setBusy(true);
    try {
      const draft = await loadDraft(id);
      if (mode === "edit") push(<PostForm initialPost={draft.post} initialOptions={draft.options} draftId={id} />);
      else if (mode === "compare") push(<VariantGrid post={draft.post} options={draft.options} />);
      else push(<PostPreview preview={await renderPost(draft.post, draft.options)} draftId={id} />);
    } catch (error) {
      await showFailureToast(error, { title: "Could Not Open Draft" });
    } finally {
      setBusy(false);
    }
  }
  return (
    <List isLoading={isLoading || busy} searchBarPlaceholder="Search saved drafts…">
      <List.EmptyView
        title="No Saved Drafts"
        description="Create a post preview or use Save Draft. Up to 50 drafts are kept locally."
        actions={
          <ActionPanel>
            <Action.Push title="Create Post Preview" icon={Icon.Plus} target={<PostForm />} />
          </ActionPanel>
        }
      />
      {drafts?.map((draft) => (
        <List.Item
          key={draft.id}
          title={draft.title}
          icon={Icon.Document}
          accessories={[
            { date: new Date(draft.savedAt), tooltip: `Saved ${new Date(draft.savedAt).toLocaleString()}` },
          ]}
          actions={
            <ActionPanel>
              <Action title="Open Preview" icon={Icon.Eye} onAction={() => open(draft.id, "preview")} />
              <Action
                title="Edit Draft"
                icon={Icon.Pencil}
                shortcut={Keyboard.Shortcut.Common.Edit}
                onAction={() => open(draft.id, "edit")}
              />
              <Action title="Compare Layouts" icon={Icon.AppWindowGrid3x3} onAction={() => open(draft.id, "compare")} />
              <Action
                title="Refresh Drafts"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
              />
              <Action
                title="Delete Draft"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={async () => {
                  if (
                    await confirmAlert({
                      title: "Delete Draft?",
                      message: draft.title,
                      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                    })
                  ) {
                    try {
                      await deleteDraft(draft.id);
                      await revalidate();
                    } catch (error) {
                      await showFailureToast(error, { title: "Could Not Delete Draft" });
                    }
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
