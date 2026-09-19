import {
  List,
  Icon,
  Color,
  ActionPanel,
  Action,
  Clipboard,
  showToast,
  Toast,
  openCommandPreferences,
} from "@raycast/api";
import { useCheck } from "./useCheck";
import { LayerResult, CheckReport } from "./types";
import { statusIcon, statusColor, diagnostics, verdictColor } from "./ui";

const SECTIONS: { title: string; test: (l: LayerResult) => boolean }[] = [
  { title: "Local network", test: (l) => ["iface", "gateway", "vpn", "proxy"].includes(l.id) },
  { title: "DNS", test: (l) => l.id.startsWith("dns") },
  { title: "Internet checks", test: (l) => l.id.startsWith("anchor:") },
  { title: "My services", test: (l) => l.id.startsWith("custom:") },
];

function Actions({ data, revalidate }: { data?: CheckReport; revalidate: () => void }) {
  return (
    <ActionPanel>
      <Action
        title="Re-check Now"
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={revalidate}
      />
      <Action
        title="Copy Diagnostics"
        icon={Icon.CopyClipboard}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
        onAction={async () => {
          await Clipboard.copy(diagnostics(data));
          await showToast({ style: Toast.Style.Success, title: "Diagnostics copied" });
        }}
      />
      <Action title="Preferences…" icon={Icon.Gear} onAction={openCommandPreferences} />
    </ActionPanel>
  );
}

export default function Command() {
  const { data, isLoading, revalidate } = useCheck();

  return (
    <List isLoading={isLoading} navigationTitle="Am I Online" searchBarPlaceholder="Filter checks…">
      <List.Section title="Status">
        <List.Item
          icon={{ source: Icon.CircleFilled, tintColor: data ? verdictColor(data.verdict) : Color.SecondaryText }}
          title={data?.title ?? "Checking…"}
          subtitle={data?.reason}
          actions={<Actions data={data} revalidate={revalidate} />}
        />
        {data?.egressIp ? (
          <List.Item
            title="Public IP"
            subtitle={data.egressIp}
            icon={Icon.Globe}
            actions={<Actions data={data} revalidate={revalidate} />}
          />
        ) : null}
      </List.Section>

      {SECTIONS.map((sec) => {
        const items = (data?.layers ?? []).filter(sec.test);
        if (items.length === 0) return null;
        return (
          <List.Section key={sec.title} title={sec.title}>
            {items.map((l) => {
              const accessories: List.Item.Accessory[] = [];
              if (l.latencyMs != null) accessories.push({ text: `${Math.round(l.latencyMs)} ms` });
              accessories.push({ icon: { source: statusIcon(l.status), tintColor: statusColor(l.status) } });
              return (
                <List.Item
                  key={l.id}
                  title={l.label}
                  subtitle={l.detail}
                  accessories={accessories}
                  actions={<Actions data={data} revalidate={revalidate} />}
                />
              );
            })}
          </List.Section>
        );
      })}

      {!isLoading && !data ? (
        <List.EmptyView
          title="No result yet"
          description="Press ⌘R to run a check."
          actions={<Actions data={data} revalidate={revalidate} />}
        />
      ) : null}
    </List>
  );
}
