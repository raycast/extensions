import { Action, ActionPanel, Color, Icon, Keyboard, LaunchProps, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { IpReport } from "./ip-report";
import { extractIp } from "./lib/ip";
import { clearRecents, forgetLookup, loadRecents } from "./lib/recents";
import { verdictFor } from "./lib/verdict";

export default function Command(props: LaunchProps<{ arguments: { ip?: string } }>) {
  const argumentIp = extractIp(props.arguments?.ip ?? "");
  if (argumentIp) {
    return <IpReport ip={argumentIp} />;
  }
  return <SearchList />;
}

function SearchList() {
  const [searchText, setSearchText] = useState("");
  const { data: recents, isLoading, revalidate } = useCachedPromise(loadRecents, [], { initialData: [] });

  const candidate = extractIp(searchText);
  const previous = recents.filter((item) => item.ip !== candidate);
  const invalidInput = searchText.trim().length > 0 && !candidate;

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter an IPv4 or IPv6 address…"
    >
      {candidate ? (
        <List.Section title="Check">
          <List.Item
            icon={{ source: Icon.MagnifyingGlass, tintColor: Color.PrimaryText }}
            title={candidate}
            subtitle="Look up on AbuseIPDB"
            actions={
              <ActionPanel>
                <Action.Push
                  title="Check IP"
                  icon={Icon.Shield}
                  target={<IpReport ip={candidate} />}
                  onPop={revalidate}
                />
                <Action.CopyToClipboard content={candidate} shortcut={Keyboard.Shortcut.Common.Copy} />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}

      <List.Section title="Recent Lookups">
        {previous.map((item) => {
          const verdict = verdictFor(item.score);
          return (
            <List.Item
              key={item.ip}
              icon={{ source: verdict.icon, tintColor: verdict.color }}
              title={item.ip}
              subtitle={`${item.score}% · ${verdict.label}`}
              accessories={[{ date: new Date(item.checkedAt), tooltip: "Last checked" }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Check Again"
                    icon={Icon.Shield}
                    target={<IpReport ip={item.ip} />}
                    onPop={revalidate}
                  />
                  <Action.CopyToClipboard content={item.ip} shortcut={Keyboard.Shortcut.Common.Copy} />
                  <Action
                    title="Remove from Recents"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={async () => {
                      await forgetLookup(item.ip);
                      revalidate();
                    }}
                  />
                  <Action
                    title="Clear All Recents"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.RemoveAll}
                    onAction={async () => {
                      await clearRecents();
                      revalidate();
                    }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      <List.EmptyView
        icon={Icon.Shield}
        title={invalidInput ? "Not a valid IP address" : "Check an IP address"}
        description={
          invalidInput
            ? `"${searchText.trim()}" is neither IPv4 nor IPv6.`
            : "Type or paste an IPv4 or IPv6 address to see its AbuseIPDB reputation."
        }
      />
    </List>
  );
}
