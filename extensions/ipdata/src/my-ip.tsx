import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Fragment, useState } from "react";
import { LookupDetail, RecordActions, SectionItems } from "./components/record";
import { cachedMyIp } from "./lib/cache";
import { flagIcon } from "./lib/flags";
import { LookupOk } from "./lib/ipdata";
import { getSettings, settingsKey } from "./lib/settings";

export default function Command() {
  const settings = getSettings();
  const hasKey = !!settings.apiKey;
  const [nonce, setNonce] = useState(0);
  const { data, isLoading } = useCachedPromise(
    (tag: string, key: string, force: number) => {
      void tag;
      void key;
      return cachedMyIp(settings, force > 0);
    },
    ["myip", settingsKey(settings), nonce],
    { keepPreviousData: true },
  );
  const refresh = () => setNonce((n) => n + 1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedLabel = (selectedId ?? "").split("#")[0] || "IPv4";
  const v4 = data?.ok ? data.v4 : null;
  const v6 = data?.ok ? data.v6 : null;
  const both = [v4?.model.ip, v6?.model.ip].filter(Boolean).join("\n");

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={!!data?.ok}
      searchBarPlaceholder="Your public addresses"
      onSelectionChange={(id) => setSelectedId(id)}
    >
      {data && !data.ok && !isLoading ? (
        <List.EmptyView
          icon={Icon.WifiDisabled}
          title="Could not detect your IP address"
          description={data.message}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={refresh} />
            </ActionPanel>
          }
        />
      ) : null}
      {data?.ok ? (
        <List.Section title="Your connection">
          <FamilyItem
            label="IPv4"
            record={v4}
            hasKey={hasKey}
            both={both}
            onRefresh={refresh}
            expanded={selectedLabel === "IPv4"}
          />
          <FamilyItem
            label="IPv6"
            record={v6}
            hasKey={hasKey}
            both={both}
            onRefresh={refresh}
            expanded={selectedLabel === "IPv6"}
          />
        </List.Section>
      ) : null}
    </List>
  );
}

function FamilyItem({
  label,
  record,
  hasKey,
  both,
  onRefresh,
  expanded,
}: {
  label: "IPv4" | "IPv6";
  record: LookupOk | null;
  hasKey: boolean;
  both: string;
  onRefresh: () => void;
  expanded: boolean;
}) {
  if (!record) {
    return (
      <List.Item
        id={label}
        title={`No ${label} connectivity`}
        icon={{ source: Icon.XMarkCircle, tintColor: Color.SecondaryText }}
        accessories={[{ text: label }]}
        detail={
          <List.Item.Detail
            markdown={[
              `# No ${label} connectivity`,
              "",
              `This machine could not reach ${label === "IPv4" ? "v4" : "v6"}.ipdata.co, which only answers over ${label}, so it has no public ${label} address right now.`,
              "",
              both ? `Your other address: \`${both}\`` : "",
            ].join("\n")}
          />
        }
        actions={
          <ActionPanel>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={onRefresh}
              shortcut={Keyboard.Shortcut.Common.Refresh}
            />
            {both ? <Action.CopyToClipboard title="Copy Address" content={both} /> : null}
          </ActionPanel>
        }
      />
    );
  }
  const ip = record.model.ip;
  return (
    <Fragment>
      <List.Item
        id={label}
        title={ip}
        icon={flagIcon(record.model)}
        accessories={[{ text: label }]}
        detail={<LookupDetail ip={ip} state={{ status: "ok", result: record }} />}
        actions={
          <RecordActions ip={ip} state={{ status: "ok", result: record }} hasKey={hasKey} onRefresh={onRefresh}>
            {both.includes("\n") ? (
              <ActionPanel.Section>
                <Action.CopyToClipboard
                  title="Copy Both Addresses"
                  content={both}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                />
              </ActionPanel.Section>
            ) : null}
          </RecordActions>
        }
      />
      {expanded ? (
        <SectionItems
          parentId={label}
          ip={ip}
          state={{ status: "ok", result: record }}
          hasKey={hasKey}
          onRefresh={onRefresh}
        />
      ) : null}
    </Fragment>
  );
}
