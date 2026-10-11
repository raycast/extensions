import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { api, QueueItem, showError, when } from "./api";
import { withConnection } from "./connect";

const REJECT: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd"], key: "backspace" },
  Windows: { modifiers: ["ctrl"], key: "backspace" },
};

function ApproveQueue() {
  const { data, isLoading, mutate, revalidate } = usePromise(
    async () => (await api<{ items: QueueItem[] }>("/queue")).items,
    [],
    {
      onError: (e) => showError(e, "Could not load the queue"),
    },
  );

  async function act(item: QueueItem, verb: "approve" | "reject") {
    const t = await showToast({ style: Toast.Style.Animated, title: verb === "approve" ? "Approving…" : "Rejecting…" });
    try {
      await mutate(api(`/queue/${item.kind}/${encodeURIComponent(item.id)}/${verb}`, { method: "POST", body: {} }), {
        optimisticUpdate: (items) => (items || []).filter((i) => !(i.id === item.id && i.kind === item.kind)),
      });
      t.style = Toast.Style.Success;
      t.title = verb === "approve" ? (item.kind === "post" ? "Post scheduled" : "Sent") : "Rejected";
    } catch (e) {
      t.hide();
      await showError(e, verb === "approve" ? "Could not approve" : "Could not reject");
      revalidate();
    }
  }

  return (
    <List isLoading={isLoading} isShowingDetail={(data || []).length > 0} searchBarPlaceholder="Filter waiting items…">
      <List.EmptyView
        icon={Icon.CheckCircle}
        title="Nothing waiting"
        description="Replies and posts that need your OK show up here."
      />
      {(data || []).map((item) => (
        <List.Item
          key={`${item.kind}:${item.id}`}
          icon={{
            source: item.kind === "post" ? Icon.Megaphone : Icon.Reply,
            tintColor: item.kind === "post" ? Color.Purple : Color.Blue,
          }}
          title={item.text.slice(0, 80) || "(empty)"}
          keywords={[item.channel, item.to]}
          accessories={[{ text: item.channel }, { text: when(item.created_at) }]}
          detail={
            <List.Item.Detail
              markdown={[
                item.incoming ? `**${item.to || "They"} wrote**\n\n> ${item.incoming.replace(/\n/g, "\n> ")}` : "",
                `**${item.kind === "post" ? "Post" : "Your reply"}**\n\n${item.text}`,
              ]
                .filter(Boolean)
                .join("\n\n")}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Connection" text={item.channel} />
                  <List.Item.Detail.Metadata.Label title="Type" text={item.kind === "post" ? "Post" : item.action} />
                  {item.to ? <List.Item.Detail.Metadata.Label title="To" text={item.to} /> : null}
                  {item.post_at ? (
                    <List.Item.Detail.Metadata.Label title="Goes out" text={new Date(item.post_at).toLocaleString()} />
                  ) : null}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action title="Approve" icon={Icon.Check} onAction={() => act(item, "approve")} />
              <Action
                title="Reject"
                icon={Icon.XMarkCircle}
                style={Action.Style.Destructive}
                shortcut={REJECT}
                onAction={async () => {
                  if (
                    await confirmAlert({
                      title: "Reject this?",
                      primaryAction: { title: "Reject", style: Alert.ActionStyle.Destructive },
                    })
                  )
                    act(item, "reject");
                }}
              />
              <Action.CopyToClipboard title="Copy Text" content={item.text} shortcut={Keyboard.Shortcut.Common.Copy} />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default withConnection(ApproveQueue);
