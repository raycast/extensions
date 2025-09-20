import {
  Action,
  ActionPanel,
  List,
  Keyboard,
  Cache,
  showToast,
  Icon,
  Color,
  getPreferenceValues,
  openCommandPreferences,
} from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { Alias, Data } from "./types";
import aliasesJSON from "./alias.json";

const cache = new Cache();

export default function Command() {
  const [showDetails, setShowDetails] = useCachedState("show-details", false);

  // Preferences
  const preferences = getPreferenceValues();
  const maxRecent = Number(preferences.MaxRecent);
  const maxPins = Number(preferences.MaxPins);
  const isPinColored = preferences.IconPinColored;
  const showTypeIcon = preferences.ShowTypeIcon;

  // Colors for type
  const typeColor = { show: Color.Green, default: Color.Blue, delete: Color.Red };

  const fetchData = async (): Promise<Data> => {
    const { aliases = aliasesJSON } = JSON.parse(cache.get("data") || "{}");
    const reversed: Alias[] = aliases.slice().reverse();
    const pins = reversed.filter((alias) => alias.pin);
    const recent = reversed.filter((alias) => alias.recent);

    return { aliases, pins, recent };
  };

  const { isLoading, data, revalidate } = useCachedPromise(fetchData, [], {
    initialData: { aliases: [], pins: [], recent: [] },
  });

  const saveAliases = async (aliases: Alias[]) => {
    cache.set("data", JSON.stringify({ aliases }));
    revalidate();
  };

  const handlePin = (alias: Alias) => {
    const aliases = data.aliases.map((a: Alias) => {
      return a.name === alias.name ? { ...a, pin: !a.pin, recent: !a.pin ? false : a.recent } : a;
    });

    saveAliases(aliases).then(() => {
      showToast(
        alias.pin
          ? { title: "Unpin", message: alias.name + " is no longer pinned" }
          : { title: "Pinned", message: alias.name + " is now pinned" },
      );
    });
  };

  const addRecent = (alias: Alias) => {
    const aliases = data.aliases.map((a: Alias) => {
      // Set as recent only if alias is not pinned
      const recent = a.pin ? a.recent : true;
      return a.name === alias.name ? { ...a, recent } : a;
    });

    saveAliases(aliases);
  };

  const clearRecent = () => {
    const aliases = data.aliases.map((alias) => ({ ...alias, recent: false }));
    saveAliases(aliases).then(() =>
      showToast({ title: "All recent removed", message: "All recent commands have been removed" }),
    );
  };

  const toKeyword = (word: string) => {
    const clean = word
      .replace(/[^a-zA-Z0-9- ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!clean) return [];

    return [...new Set([clean, clean.replace(/--/g, "")])];
  };
  const Item = ({ alias, hidePin }: { alias: Alias; hidePin?: boolean }) => {
    const { name, command, type, description, pin = false, recent = false } = alias;

    const detail = `## ${name}
  ####
  \`\`\`
  ${command}
  \`\`\`
  ####
  ${description}`;
    return (
      <List.Item
        icon={showTypeIcon ? { source: Icon.Dot, tintColor: typeColor[type] } : undefined}
        title={name}
        subtitle={{ value: command, tooltip: command }}
        detail={<List.Item.Detail markdown={detail} />}
        keywords={[...description.split(" "), ...command.split(" ").map(toKeyword).flat()]}
        accessories={[
          ...(pin && !hidePin
            ? [{ icon: { source: Icon.Tack, ...(isPinColored && { tintColor: Color.Yellow }) } }]
            : []),
        ]}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action.CopyToClipboard title="Copy Alias" content={name} onCopy={() => addRecent(alias)} />
              <Action.Paste title="Paste Alias" content={name} onPaste={() => addRecent(alias)} />
            </ActionPanel.Section>

            <>
              {pin && (
                <Action
                  icon={Icon.TackDisabled}
                  title="Unpin"
                  onAction={() => handlePin(alias)}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                />
              )}
              {pin || (
                <Action
                  icon={Icon.Tack}
                  title="Pin"
                  onAction={() => handlePin(alias)}
                  shortcut={Keyboard.Shortcut.Common.Pin}
                />
              )}
            </>

            <ActionPanel.Section>
              <Action
                icon={Icon.AppWindowSidebarRight}
                title="Toggle Details"
                onAction={() => setShowDetails(!showDetails)}
                shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
              />
            </ActionPanel.Section>

            {recent && data.recent.length && (
              <Action
                icon={Icon.XMarkCircle}
                title="Clear All Recent"
                onAction={clearRecent}
                shortcut={Keyboard.Shortcut.Common.RemoveAll}
              />
            )}
            <Action icon={Icon.Gear} title="Change Colors in Preferences" onAction={openCommandPreferences} />
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search command, description or alias"
      isShowingDetail={showDetails}
    >
      <List.Section title="Pinned" subtitle={data.pins.length > maxPins ? `${data.pins.length}` : ""}>
        {data.pins.slice(0, maxPins).map((alias) => (
          <Item key={alias.name} alias={alias} hidePin />
        ))}
      </List.Section>

      <List.Section title="Recent" subtitle={data.recent.length > maxRecent ? `${data.recent.length}` : ""}>
        {data.recent.slice(0, maxRecent).map((alias) => (
          <Item key={alias.name} alias={alias} />
        ))}
      </List.Section>

      <List.Section title="All aliases" subtitle={`${data.aliases.length}`}>
        {data.aliases.map((alias) => (
          <Item key={alias.name} alias={alias} />
        ))}
      </List.Section>
    </List>
  );
}
