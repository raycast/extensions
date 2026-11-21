import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Fragment, useState } from "react";
import { LookupDetail, RecordActions, SectionItems } from "./components/record";
import { cachedMyIp } from "./lib/cache";
import { flagIcon } from "./lib/flags";
import { LookupError, LookupOk } from "./lib/ipdata";
import { LookupState } from "./lib/hooks";
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
            keyError={data.v4KeyError}
            hasKey={hasKey}
            both={both}
            onRefresh={refresh}
            expanded={selectedLabel === "IPv4"}
          />
          <FamilyItem
            label="IPv6"
            record={v6}
            keyError={data.v6KeyError}
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
  keyError,
  hasKey,
  both,
  onRefresh,
  expanded,
}: {
  label: "IPv4" | "IPv6";
  record: LookupOk | null;
  keyError?: LookupError;
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
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefresh} />
            {both ? <Action.CopyToClipboard title="Copy Address" content={both} /> : null}
          </ActionPanel>
        }
      />
    );
  }
  const ip = record.model.ip;
  // A failed keyed lookup is shown as that error, with the detected address still listed.
  const state: LookupState = keyError ? { status: "error", result: keyError } : { status: "ok", result: record };
  return (
    <Fragment>
      <List.Item
        id={label}
        title={ip}
        icon={keyError ? Icon.Warning : flagIcon(record.model)}
        accessories={[{ text: label }]}
        detail={<LookupDetail ip={ip} state={state} />}
        actions={
          <RecordActions ip={ip} state={state} hasKey={hasKey} onRefresh={onRefresh}>
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
      {expanded ? <SectionItems parentId={label} ip={ip} state={state} hasKey={hasKey} onRefresh={onRefresh} /> : null}
    </Fragment>
  );
}
