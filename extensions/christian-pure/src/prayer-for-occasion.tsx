import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { APP_API, PrayersAloud, prayerParagraphs, prayerTitle, trackedLink } from "./api";

export default function Command() {
  const [choice, setChoice] = useState<string>("meal/open");
  const { data, isLoading, error } = useFetch<PrayersAloud>(`${APP_API}/prayers-aloud`);

  const lengths = Object.fromEntries((data?.lengths ?? []).map((l) => [l.key, l.long]));
  const moments = (data?.occasions ?? []).flatMap((o) =>
    o.moments.map((m) => ({ value: `${o.key}/${m.key}`, title: prayerTitle(o.label, m.label) })),
  );
  const [occasion, moment] = choice.split("/");
  const title = moments.find((m) => m.value === choice)?.title ?? "";
  const pieces = (data?.pieces ?? []).filter((p) => p.occasion === occasion && p.moment === moment);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={pieces.length > 0}
      navigationTitle="Prayer for an Occasion"
      searchBarPlaceholder="Search these prayers"
      searchBarAccessory={
        <List.Dropdown tooltip="Occasion" value={choice} onChange={setChoice}>
          {moments.map((m) => (
            <List.Dropdown.Item key={m.value} title={m.title} value={m.value} />
          ))}
        </List.Dropdown>
      }
    >
      {error && !data ? (
        <List.EmptyView
          icon={Icon.WifiDisabled}
          title="Couldn't reach christianpure.com"
          description="Check your connection and try again."
        />
      ) : (
        pieces.map((p) => {
          const text = prayerParagraphs(p.text);
          const ours = p.source.startsWith("From our article:");
          const source = p.source.replace(/^From our article:\s*/, "");
          const link = trackedLink(p.url);
          const sourceLine = ours
            ? `From [${source}](${link}) on Christian Pure.`
            : `${source}, via [Christian Pure](${link}).`;
          return (
            <List.Item
              key={p.id}
              title={text.split(/\s+/).slice(0, 8).join(" ") + "…"}
              accessories={[{ text: lengths[p.length] ?? "" }]}
              keywords={text.split(/\W+/).filter((w) => w.length > 3)}
              detail={
                <List.Item.Detail
                  markdown={[`## ${title}`, `*${lengths[p.length] ?? ""} to pray aloud*`, text, sourceLine].join(
                    "\n\n",
                  )}
                />
              }
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Prayer" content={text} />
                  <Action.Paste title="Paste Prayer" content={text} />
                  <Action.OpenInBrowser title="Open the Source" url={link} icon={Icon.Book} />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
