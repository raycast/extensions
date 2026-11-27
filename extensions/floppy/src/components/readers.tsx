import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { getAnalytics } from "../lib/api";
import { ago, duration, readerPages, readerPlace, shortUrl } from "../lib/format";

/** Who read one link: one row per person, most recent first. */
export function ReadersView({ linkId, name, url }: { linkId: string; name: string; url: string }) {
  const { data, isLoading } = useCachedPromise(getAnalytics, [linkId], {
    onError: (e) => {
      showFailureToast(e, { title: "Couldn't load who read it" });
    },
  });
  const people = data?.people ?? [];
  const views = data?.views ?? 0;

  return (
    <List isLoading={isLoading} navigationTitle={name} searchBarPlaceholder="Filter people">
      {!isLoading && !people.length ? (
        <List.EmptyView
          icon={Icon.Eye}
          title="Nobody has read it yet"
          description={`Send ${shortUrl(url)} and you'll see each person here.`}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Link" content={url} />
            </ActionPanel>
          }
        />
      ) : null}
      <List.Section title={name} subtitle={`${views} ${views === 1 ? "view" : "views"}`}>
        {people.map((r) => (
          <List.Item
            key={`${r.share_id}-${r.label}`}
            title={r.label}
            subtitle={[readerPages(r), readerPlace(r)].filter(Boolean).join(" · ")}
            icon={{ source: Icon.Person, tintColor: r.completion >= 0.8 ? Color.Green : Color.Blue }}
            accessories={[
              {
                tag: {
                  value: `${Math.round(r.completion * 100)}%`,
                  color: r.completion >= 0.8 ? Color.Green : Color.Blue,
                },
              },
              { icon: Icon.Clock, text: duration(r.active_ms), tooltip: "Time reading" },
              { text: ago(r.last_seen), tooltip: new Date(r.last_seen).toLocaleString() },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Link" content={url} />
                <Action.OpenInBrowser title="Open Analytics on Fpy.sh" url="https://fpy.sh/app/analytics" />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
