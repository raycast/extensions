import {
  Action,
  ActionPanel,
  Color,
  Icon,
  LaunchProps,
  List,
  getPreferenceValues,
  Keyboard,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { normalizeDomain, runChecks } from "./checks";
import { CheckResult, Status, summarize } from "./model";

const icon: Record<Status, { source: Icon; tintColor: Color }> = {
  ok: { source: Icon.CheckCircle, tintColor: Color.Green },
  warn: { source: Icon.ExclamationMark, tintColor: Color.Orange },
  fail: { source: Icon.XMarkCircle, tintColor: Color.Red },
};

export default function Command(
  props: LaunchProps<{ arguments: Arguments.Check }>,
) {
  const prefs = getPreferenceValues<Preferences.Check>();
  const raw = props.arguments.domain?.trim() || prefs.domain?.trim() || "";
  const domain = raw ? normalizeDomain(raw) : undefined;

  const { data, isLoading, revalidate } = useCachedPromise(
    (d: string, ios: string, android: string) =>
      runChecks({ domain: d, iosAppId: ios, androidPackage: android }),
    [domain ?? "", prefs.iosAppId ?? "", prefs.androidPackage ?? ""],
    { execute: !!domain },
  );

  if (!domain) {
    return (
      <List searchBarPlaceholder="Filter checks">
        <List.EmptyView
          icon={Icon.Link}
          title={raw ? "Not a valid domain" : "No domain set"}
          description={
            raw
              ? `"${raw}" must be a host name such as example.com.`
              : "Pass a domain as the command argument, or set one in the extension preferences."
          }
        />
      </List>
    );
  }

  const rows: CheckResult[] = data ?? [];
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter checks">
      <List.Section
        title={domain}
        subtitle={data ? summarize(rows) : undefined}
      >
        {rows.map((r) => (
          <List.Item
            key={r.id}
            title={r.title}
            subtitle={r.detail}
            icon={icon[r.status]}
            accessories={[{ tag: r.platform }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={r.url} />
                <Action.CopyToClipboard
                  title="Copy Detail"
                  content={`${r.title} (${domain}): ${r.detail}`}
                />
                <Action
                  title="Check Again"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
