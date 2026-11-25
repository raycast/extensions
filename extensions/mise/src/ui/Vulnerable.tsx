import { Action, ActionPanel, Color, Icon, Keyboard, List, type Image } from "@raycast/api";
import { fixedVersion, severityName, type Advisory, type Severity, type VulnerableTool } from "../mise/audit";
import type { MiseLocation } from "../mise/locate";
import { upgradeVulnerable } from "../mise/operations";
import { miseCommandLine } from "../terminal/script";
import { upgradeOptions, type MisePreferences } from "./preferences";
import { RunInTerminalAction } from "./runInTerminal";
import { runOperation } from "./runOperation";

const SEVERITY_COLORS: Record<Severity, Color> = {
  critical: Color.Red,
  high: Color.Red,
  medium: Color.Orange,
  low: Color.Yellow,
};

// An advisory mise can't rate still needs attention, so its icon is a caution rather than grey.
export function vulnerableIcon(severity: Severity | undefined): Image.ImageLike {
  return { source: Icon.Warning, tintColor: severity ? SEVERITY_COLORS[severity] : Color.Yellow };
}

function severityTag(severity: Severity | undefined): List.Item.Accessory {
  return { tag: { value: severityName(severity), color: severity ? SEVERITY_COLORS[severity] : Color.SecondaryText } };
}

export function VulnerableItem({
  vulnerable,
  location,
  prefs,
  refresh,
  revalidate,
}: {
  vulnerable: VulnerableTool;
  location: MiseLocation;
  prefs: MisePreferences;
  refresh: () => void;
  revalidate: () => void;
}) {
  const upgradeAll = upgradeVulnerable(upgradeOptions(prefs, location));
  const count = vulnerable.advisories.length;
  const fixedIn = fixedVersion(vulnerable);
  const accessories: List.Item.Accessory[] = [
    { icon: Icon.Bug, text: String(count), tooltip: count === 1 ? "1 advisory" : `${count} advisories` },
    severityTag(vulnerable.severity),
    ...(fixedIn ? [{ text: `fixed in ${fixedIn}` }] : []),
  ];

  return (
    <List.Item
      icon={vulnerableIcon(vulnerable.severity)}
      title={vulnerable.tool}
      subtitle={vulnerable.version}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.Push title="Show Advisories" icon={Icon.List} target={<AdvisoryList vulnerable={vulnerable} />} />
          <Action.CopyToClipboard
            title="Copy Upgrade Command"
            content={miseCommandLine({ path: "mise" }, upgradeAll)}
          />
          <ActionPanel.Section>
            <Action
              title="Upgrade Vulnerable Tools"
              icon={Icon.ArrowUp}
              onAction={() => runOperation(location, upgradeAll, refresh)}
            />
            <RunInTerminalAction
              title="Upgrade Vulnerable Tools in Terminal"
              command={miseCommandLine(location, upgradeAll)}
            />
          </ActionPanel.Section>
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
}

function AdvisoryList({ vulnerable }: { vulnerable: VulnerableTool }) {
  return (
    <List navigationTitle={`${vulnerable.tool} ${vulnerable.version}`} searchBarPlaceholder="Search advisories">
      {vulnerable.advisories.map((advisory, index) => (
        <AdvisoryItem key={`${advisory.id}-${index}`} advisory={advisory} />
      ))}
    </List>
  );
}

function AdvisoryItem({ advisory }: { advisory: Advisory }) {
  return (
    <List.Item
      title={advisory.summary || advisory.id}
      subtitle={advisory.summary ? advisory.id : undefined}
      keywords={[advisory.summary, advisory.id, ...advisory.aliases, severityName(advisory.severity)]}
      accessories={[
        ...(advisory.aliases.length > 0 ? [{ text: advisory.aliases.join(", ") }] : []),
        severityTag(advisory.severity),
      ]}
      actions={
        <ActionPanel>
          {advisory.url && <Action.OpenInBrowser url={advisory.url} />}
          <Action.CopyToClipboard title="Copy ID" content={advisory.id} />
        </ActionPanel>
      }
    />
  );
}
