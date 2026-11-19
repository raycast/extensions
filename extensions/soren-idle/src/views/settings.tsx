import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { GameState, Settings as GameSettings } from "../engine/types";

type Toggle = "compactNumbers" | "notifyStopped" | "notifyFinished" | "notifyBounty" | "notifyRare";

const NUMBERS: { key: Toggle; title: string; blurb: string }[] = [
  {
    key: "compactNumbers",
    title: "Compact Numbers",
    blurb: "Show 12.4K instead of 12,400 for credits, XP and item counts.",
  },
];

const NOTIFICATIONS: { key: Toggle; title: string; blurb: string }[] = [
  { key: "notifyStopped", title: "Task Stopped", blurb: "A task ran out of materials, storage room or HP." },
  { key: "notifyFinished", title: "Run Finished", blurb: "A task you gave a number of runs is done." },
  { key: "notifyBounty", title: "Bounty Ready", blurb: "A bounty you took on is complete." },
  { key: "notifyRare", title: "Rare Find", blurb: "A rare drop landed." },
];

export function Settings(props: {
  state: GameState;
  onChange: (change: (s: GameState) => GameState) => void;
  onExport: () => void;
  onImport: () => void;
}) {
  const { settings } = props.state;
  const toggle = (key: keyof GameSettings) => () =>
    props.onChange((s) => ({ ...s, settings: { ...s.settings, [key]: !s.settings[key] } }));
  const row = (item: { key: Toggle; title: string; blurb: string }, note = "") => (
    <List.Item
      key={item.key}
      title={item.title}
      icon={settings[item.key] ? Icon.CheckCircle : Icon.Circle}
      accessories={[
        {
          tag: {
            value: settings[item.key] ? "On" : "Off",
            color: settings[item.key] ? Color.Green : Color.SecondaryText,
          },
        },
      ]}
      detail={<List.Item.Detail markdown={`# ${item.title}\n${item.blurb}${note}`} />}
      actions={
        <ActionPanel>
          <Action title={settings[item.key] ? "Disable" : "Enable"} icon={Icon.Switch} onAction={toggle(item.key)} />
        </ActionPanel>
      }
    />
  );
  return (
    <>
      <List.Section title="Numbers">{NUMBERS.map((item) => row(item))}</List.Section>
      <List.Section title="Notifications">
        {NOTIFICATIONS.map((item) =>
          row(
            item,
            "\n\nSent by the menu bar ticker, and only while Notify When a Task Stops is on in its preferences.",
          ),
        )}
      </List.Section>
      <List.Section title="Save">
        <List.Item
          title="Copy Save to Clipboard"
          icon={Icon.CopyClipboard}
          detail={<List.Item.Detail markdown={"# Copy Save\nPuts a backup of your game on the clipboard as text."} />}
          actions={
            <ActionPanel>
              <Action title="Copy Save" icon={Icon.CopyClipboard} onAction={props.onExport} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Import Save from Clipboard"
          icon={Icon.Download}
          detail={
            <List.Item.Detail
              markdown={"# Import Save\nReplaces your game with a save you copied. You are asked first."}
            />
          }
          actions={
            <ActionPanel>
              <Action
                title="Import Save"
                icon={Icon.Download}
                style={Action.Style.Destructive}
                onAction={props.onImport}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </>
  );
}
