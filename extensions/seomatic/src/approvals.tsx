import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { API_BASE, authHeaders, parseResponse } from "./api";

interface Approval {
  id: string;
  type: string | null;
  title: string | null;
  target: string | null;
  why: string | null;
  approve_url: string | null;
  review_url?: string;
  needs_review: boolean;
}

interface Approvals {
  count: number;
  shown: number;
  items: Approval[];
  all_url?: string;
}

export default function Command() {
  const { data, isLoading, revalidate } = useFetch<Approvals>(`${API_BASE}/approvals`, {
    headers: authHeaders(),
    parseResponse,
    failureToastOptions: { title: "Could not load approvals" },
  });

  const subtitle = data && data.count > data.shown ? `${data.shown} of ${data.count} shown` : undefined;

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Filter fixes waiting for approval">
      <List.EmptyView icon={Icon.CheckCircle} title="Nothing waiting for your approval" />
      <List.Section title="Waiting for Approval" subtitle={subtitle}>
        {data?.items.map((item) => {
          const openUrl = item.review_url ?? data.all_url;
          return (
            <List.Item
              key={item.id}
              title={item.title ?? item.type ?? "Fix"}
              keywords={[item.target ?? "", item.type ?? ""]}
              accessories={
                item.needs_review
                  ? [{ tag: { value: "Needs review", color: Color.Orange } }]
                  : [{ text: item.type ?? "" }]
              }
              detail={
                <List.Item.Detail
                  markdown={`## ${item.title ?? "Fix"}\n\n${item.why ?? ""}`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      {item.type ? <List.Item.Detail.Metadata.Label title="Type" text={item.type} /> : null}
                      {item.target ? <List.Item.Detail.Metadata.Label title="Page" text={item.target} /> : null}
                      <List.Item.Detail.Metadata.Label
                        title="Approval"
                        text={item.needs_review ? "Needs a full review in SEOmatic" : "One-click approve available"}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  {openUrl ? <Action.OpenInBrowser title="Open in SEOmatic" url={openUrl} /> : null}
                  {item.approve_url ? (
                    <Action.OpenInBrowser title="Open Approve Page" icon={Icon.Checkmark} url={item.approve_url} />
                  ) : null}
                  {data.all_url ? (
                    <Action.OpenInBrowser title="Open All Approvals" icon={Icon.List} url={data.all_url} />
                  ) : null}
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={revalidate}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
