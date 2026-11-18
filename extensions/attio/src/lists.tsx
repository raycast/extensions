import { failToast } from "@chrismessina/raycast-kit";
import { Action, ActionPanel, Icon, Keyboard, List, open, showToast, Toast } from "@raycast/api";
import { listLists, listListViews } from "./api/endpoints";
import type { AttioList } from "./api/types";
import { guard } from "./components/Guard";
import { useAttio } from "./hooks/useAttio";
import { useSelf } from "./hooks/useSelf";

export default function Lists() {
  const h = useAttio("listLists", async () => (await listLists()).data, []);
  const { isLoading, data, error } = h;
  const lists: AttioList[] = data ?? [];
  const { workspace } = useSelf();

  const g = guard(h.guardInput(lists.length > 0));
  if (g) return g;

  async function openList(list: AttioList) {
    const toast = await showToast(Toast.Style.Animated, "Opening…");
    try {
      const { data: views } = await listListViews(list.id.list_id);
      const viewId = views[0]?.id.view_id;
      if (!viewId) throw new Error("This list has no views");
      if (!workspace) throw new Error("Workspace not resolved yet");
      await open(`https://app.attio.com/${workspace.slug}/collection/${list.id.list_id}/view/${viewId}`);
      toast.hide();
    } catch (error) {
      failToast(toast, error, { title: "Failed" });
    }
  }

  return (
    <List isLoading={isLoading}>
      {!isLoading && !lists.length && !error ? (
        <List.EmptyView
          icon={Icon.List}
          title="No lists yet"
          description="There are currently no lists created. Browsing list entries is coming in a follow-on release."
        />
      ) : (
        lists.map((list) => (
          <List.Item
            key={list.id.list_id}
            icon={Icon.List}
            title={list.name}
            subtitle={Array.isArray(list.parent_object) ? list.parent_object.join(", ") : list.parent_object}
            actions={
              <ActionPanel>
                <Action
                  icon="attio.png"
                  title="Open in Attio"
                  shortcut={Keyboard.Shortcut.Common.Open}
                  onAction={() => openList(list)}
                />
                <Action.CopyToClipboard title="Copy List ID" content={list.id.list_id} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
