import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { Callsign, lookupCallsign } from "./qrz";

const MIN_LENGTH = 3;

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const callsign = searchText.trim().toUpperCase();
  const canSearch = callsign.length >= MIN_LENGTH;

  const { data, error, isLoading } = useCachedPromise(lookupCallsign, [callsign], { execute: canSearch });
  const result = canSearch ? data : undefined;

  const emptyView = !canSearch
    ? { title: "Enter a Callsign" }
    : isLoading
      ? { title: "Searching…" }
      : error
        ? { title: "Lookup Failed", description: error.message, icon: Icon.Warning }
        : { title: `${callsign} Not Found` };

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter a callsign, e.g. DL5MN"
      isShowingDetail={!!result}
      throttle
    >
      {result ? (
        <List.Item
          title={result.call}
          subtitle={fullName(result)}
          detail={<CallsignDetail callsign={result} />}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open on QRZ.com" url={`https://www.qrz.com/db/${result.call}`} />
              <Action.CopyToClipboard title="Copy Callsign" content={result.call} />
              {result.grid && <Action.CopyToClipboard title="Copy Grid Locator" content={result.grid} />}
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView icon={Icon.MagnifyingGlass} {...emptyView} />
      )}
    </List>
  );
}

function CallsignDetail({ callsign: c }: { callsign: Callsign }) {
  const qsl = [c.lotw === "1" && "LoTW", c.eqsl === "1" && "eQSL", c.mqsl === "1" && "Paper"].filter(Boolean);
  const fields: [string, string | undefined][] = [
    ["Name", fullName(c)],
    ["Address", [c.addr1, [c.zip, c.addr2].filter(Boolean).join(" "), c.state].filter(Boolean).join(", ")],
    ["Country", c.country],
    ["Grid Locator", c.grid],
    ["License Class", c.class],
    ["CQ Zone", c.cqzone],
    ["ITU Zone", c.ituzone],
    ["Email", c.email],
    ["QSL", qsl.join(", ")],
  ];

  return (
    <List.Item.Detail
      markdown={c.image ? `![${c.call}](${c.image})` : undefined}
      metadata={
        <List.Item.Detail.Metadata>
          {fields
            .filter(([, text]) => text)
            .map(([title, text]) => (
              <List.Item.Detail.Metadata.Label key={title} title={title} text={text} />
            ))}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function fullName(c: Callsign) {
  return [c.fname, c.name].filter(Boolean).join(" ") || undefined;
}
