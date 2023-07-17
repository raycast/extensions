import { Clipboard, getPreferenceValues, Icon, MenuBarExtra, openCommandPreferences, showHUD } from "@raycast/api";
import { Preferences } from "./types/preferences";
import { getShortcuts } from "./hooks/hooks";
import { handleLiveTemplate, runShortcut, Shortcut, Tags } from "./util/shortcut";
import { fetchItemInput } from "./util/input";

export default function ShortcutLibrary() {
  const preferences = getPreferenceValues<Preferences>();

  const { allShortcuts, loading } = getShortcuts(0, preferences);
  return (
    <MenuBarExtra
      isLoading={loading}
      tooltip={"Shortcut Library"}
      icon={{
        source: {
          light: "shortcuts-library-menu-bar-icon.png",
          dark: "shortcuts-library-menu-bar-icon@dark.png",
        },
      }}
    >
      <MenuBarShortcuts allShortcuts={allShortcuts} preferences={preferences} />
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title={"Preferences"}
        icon={Icon.Gear}
        onAction={() => {
          openCommandPreferences().then();
        }}
        shortcut={{ modifiers: ["cmd"], key: "," }}
      />
    </MenuBarExtra>
  );
}

function MenuBarShortcuts(props: { allShortcuts: Shortcut[]; preferences: Preferences }) {
  const { allShortcuts, preferences } = props;
  return (
    <>
      {preferences.annotation && (
        <MenuBarExtra.Submenu title={Tags.ANNOTATION} icon={Icon.Paperclip}>
          {allShortcuts.map(
            (value) =>
              value.info.tag.includes(Tags.ANNOTATION) && (
                <MenuBarShortcutItem key={value.info.id} shortcut={value} preferences={preferences} />
              )
          )}
        </MenuBarExtra.Submenu>
      )}
      {preferences.caser && (
        <MenuBarExtra.Submenu title={Tags.CASE} icon={Icon.Text}>
          {allShortcuts.map(
            (value) =>
              value.info.tag.includes(Tags.CASE) && (
                <MenuBarShortcutItem key={value.info.id} shortcut={value} preferences={preferences} />
              )
          )}
        </MenuBarExtra.Submenu>
      )}
      {preferences.coder && (
        <MenuBarExtra.Submenu title={Tags.CODER} icon={Icon.CodeBlock}>
          {allShortcuts.map(
            (value) =>
              value.info.tag.includes(Tags.CODER) && (
                <MenuBarShortcutItem key={value.info.id} shortcut={value} preferences={preferences} />
              )
          )}
        </MenuBarExtra.Submenu>
      )}
      {preferences.deletion && (
        <MenuBarExtra.Submenu title={Tags.DELETION} icon={Icon.Trash}>
          {allShortcuts.map(
            (value) =>
              value.info.tag.includes(Tags.DELETION) && (
                <MenuBarShortcutItem key={value.info.id} shortcut={value} preferences={preferences} />
              )
          )}
        </MenuBarExtra.Submenu>
      )}
      {preferences.format && (
        <MenuBarExtra.Submenu title={Tags.FORMAT} icon={Icon.AppWindowGrid3x3}>
          {allShortcuts.map(
            (value) =>
              value.info.tag.includes(Tags.FORMAT) && (
                <MenuBarShortcutItem key={value.info.id} shortcut={value} preferences={preferences} />
              )
          )}
        </MenuBarExtra.Submenu>
      )}
      {preferences.markdown && (
        <MenuBarExtra.Submenu title={Tags.MARKDOWN} icon={Icon.QuoteBlock}>
          {allShortcuts.map(
            (value) =>
              value.info.tag.includes(Tags.MARKDOWN) && (
                <MenuBarShortcutItem key={value.info.id} shortcut={value} preferences={preferences} />
              )
          )}
        </MenuBarExtra.Submenu>
      )}
      {preferences.replacement && (
        <MenuBarExtra.Submenu title={Tags.REPLACEMENT} icon={Icon.Switch}>
          {allShortcuts.map(
            (value) =>
              value.info.tag.includes(Tags.REPLACEMENT) && (
                <MenuBarShortcutItem key={value.info.id} shortcut={value} preferences={preferences} />
              )
          )}
        </MenuBarExtra.Submenu>
      )}
      {preferences.time && (
        <MenuBarExtra.Submenu title={Tags.TIME} icon={Icon.Clock}>
          {allShortcuts.map(
            (value) =>
              value.info.tag.includes(Tags.TIME) && (
                <MenuBarShortcutItem key={value.info.id} shortcut={value} preferences={preferences} />
              )
          )}
        </MenuBarExtra.Submenu>
      )}
      {preferences.other && (
        <MenuBarExtra.Submenu title={Tags.OTHER} icon={Icon.Ellipsis}>
          {allShortcuts.map(
            (value) =>
              value.info.tag.includes(Tags.OTHER) && (
                <MenuBarShortcutItem key={value.info.id} shortcut={value} preferences={preferences} />
              )
          )}
        </MenuBarExtra.Submenu>
      )}
    </>
  );
}

function MenuBarShortcutItem(props: { shortcut: Shortcut; preferences: Preferences }) {
  const { shortcut, preferences } = props;
  return (
    <MenuBarExtra.Item
      key={shortcut.info.id}
      icon={shortcut.info.icon}
      title={shortcut.info.name}
      onAction={async (event) => {
        const _runShortcut = runShortcut(await fetchItemInput(), handleLiveTemplate(shortcut.tactions));
        if (preferences.primaryAction === "Paste") {
          if (event.type == "left-click") {
            await showHUD("Pasted result to active app");
            await Clipboard.paste(_runShortcut);
          } else {
            await showHUD("Copy result to clipboard");
            await Clipboard.copy(_runShortcut);
          }
        } else {
          if (event.type == "left-click") {
            await showHUD("Copy result to clipboard");
            await Clipboard.copy(_runShortcut);
          } else {
            await showHUD("Pasted result to active app");
            await Clipboard.paste(_runShortcut);
          }
        }
      }}
    />
  );
}
