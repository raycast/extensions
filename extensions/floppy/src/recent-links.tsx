import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
  Clipboard,
  Keyboard,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { createShare, getAnalytics, listLinks, type LinkSummary } from "./lib/api";
import { ago, bytes, kindIcon, readersMarkdown, shortUrl } from "./lib/format";
import { ReadersView } from "./components/readers";

export default function RecentLinks() {
  const [showingDetail, setShowingDetail] = useState(true);
  const { data, isLoading, revalidate } = useCachedPromise(() => listLinks(100), [], {
    onError: (e) => {
      showFailureToast(e, { title: "Couldn't load your links" });
    },
  });
  const links = (data ?? []).filter((l) => l.status === "ready");

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail && links.length > 0}
      searchBarPlaceholder="Filter your links"
    >
      {!isLoading && !links.length ? (
        <List.EmptyView icon="floppy.png" title="No links yet" description="Share a file and it shows up here." />
      ) : null}
      {links.map((l) => (
        <List.Item
          key={l.id}
          title={l.name}
          icon={kindIcon(l.kind)}
          keywords={[l.slug, l.team?.name ?? "Personal"]}
          subtitle={showingDetail ? undefined : shortUrl(l.url)}
          accessories={
            showingDetail
              ? [
                  {
                    text: { value: String(l.views), color: l.views ? Color.Blue : Color.SecondaryText },
                    icon: Icon.Eye,
                  },
                ]
              : [
                  { text: String(l.views), icon: Icon.Eye, tooltip: "Views" },
                  { text: ago(l.created_at), tooltip: new Date(l.created_at).toLocaleString() },
                ]
          }
          detail={showingDetail ? <LinkDetail link={l} /> : undefined}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.CopyToClipboard title="Copy Link" content={l.url} />
                <Action.OpenInBrowser url={l.url} />
                <Action.Push
                  title="Who Read It"
                  icon={Icon.Eye}
                  shortcut={{ modifiers: ["cmd"], key: "i" }}
                  target={<ReadersView linkId={l.id} name={l.name} url={l.url} />}
                />
                <Action.Push
                  title="Copy Link for One Person"
                  icon={Icon.AddPerson}
                  shortcut={Keyboard.Shortcut.Common.New}
                  target={<NewShareForm link={l} />}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title={showingDetail ? "Hide Readers" : "Show Readers"}
                  icon={Icon.Sidebar}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  onAction={() => setShowingDetail((v) => !v)}
                />
                <Action.Paste title="Paste Link" content={l.url} shortcut={{ modifiers: ["cmd", "shift"], key: "v" }} />
                <Action
                  title="Reload"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={revalidate}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function LinkDetail({ link }: { link: LinkSummary }) {
  const { data, isLoading } = useCachedPromise(getAnalytics, [link.id]);
  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={data ? readersMarkdown(link.name, link.url, data.people, data.views) : `## ${link.name}`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Link title="Link" text={shortUrl(link.url)} target={link.url} />
          <List.Item.Detail.Metadata.Label title="Views" text={String(data?.views ?? link.views)} icon={Icon.Eye} />
          <List.Item.Detail.Metadata.Label
            title="People"
            text={String(data?.people.length ?? link.shares)}
            icon={Icon.TwoPeople}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Size" text={bytes(link.size)} />
          <List.Item.Detail.Metadata.Label title="Made" text={new Date(link.created_at).toLocaleString()} />
          <List.Item.Detail.Metadata.Label
            title="Expires"
            text={link.expires_at ? new Date(link.expires_at).toLocaleString() : "Never"}
          />
          <List.Item.Detail.Metadata.Label title="Space" text={link.team?.name ?? "Personal"} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

/** A separate URL for one named person, so you see exactly what they read. */
function NewShareForm({ link }: { link: LinkSummary }) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle={link.name}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Copy Link for This Person"
            icon={Icon.Clipboard}
            onSubmit={async ({ label }: { label: string }) => {
              if (!label.trim()) {
                await showToast({ style: Toast.Style.Failure, title: "Type who it's for" });
                return;
              }
              const toast = await showToast({ style: Toast.Style.Animated, title: "Making the link" });
              try {
                const share = await createShare(link.id, label.trim());
                await Clipboard.copy(share.url);
                toast.style = Toast.Style.Success;
                toast.title = `Copied ${shortUrl(share.url)}`;
                toast.message = `Only for ${share.label}`;
                pop();
              } catch (e) {
                toast.style = Toast.Style.Failure;
                toast.title = "Couldn't make the link";
                toast.message = e instanceof Error ? e.message : String(e);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={`A separate URL for ${link.name}, so you see exactly what this person read.`} />
      <Form.TextField id="label" title="For" placeholder="Sequoia – Jane" autoFocus />
    </Form>
  );
}
