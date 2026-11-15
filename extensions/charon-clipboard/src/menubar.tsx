import {
  Clipboard,
  getPreferenceValues,
  Icon,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  openExtensionPreferences,
} from "@raycast/api";
import { pasteHistoryItem } from "./lib/bridge";
import { writeHelperConfig } from "./lib/config";
import { getNumberPref, loadFolders, loadHistory, removeHistoryItem } from "./lib/storage";
import type { HistoryItem, Preferences } from "./lib/types";
import { isHelperEnabled } from "./lib/watcher";

/** Same truncation rule as the popup menu. */
function title(text: string, max: number) {
  const t =
    text
      .replace(/[\r\n\t]+/g, " ")
      .replace(/ {2,}/g, " ")
      .trim() || "(Blank)";
  const chars = Array.from(t);
  return chars.length > max ? `${chars.slice(0, max).join("")}...` : t;
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  writeHelperConfig();
  const history = loadHistory();
  const folders = loadFolders().filter((f) => f.enabled);
  const inline = getNumberPref("itemsInline", 0, 0);
  const per = getNumberPref("itemsPerFolder", 10);
  const max = getNumberPref("maxTitleLength", 20);
  const numbered = prefs.numbered ?? true;

  const item = (h: HistoryItem, n: number) => (
    <MenuBarExtra.Item
      key={h.id}
      title={`${numbered ? `${n}. ` : ""}${title(h.text, max)}`}
      tooltip={h.kind === "image" ? undefined : h.text.slice(0, 200)}
      icon={h.kind === "image" && prefs.imagePreview && h.imagePath ? { source: h.imagePath } : undefined}
      onAction={(e) => (e.type === "right-click" ? pasteHistoryItem(h, true) : pasteHistoryItem(h))}
      alternate={
        <MenuBarExtra.Item
          key={`${h.id}-delete`}
          title={`Delete: ${title(h.text, max)}`}
          icon={Icon.Trash}
          onAction={() => removeHistoryItem(h.id)}
        />
      }
    />
  );

  const rest = history.slice(inline);
  const groups: HistoryItem[][] = [];
  for (let i = 0; i < rest.length; i += per) groups.push(rest.slice(i, i + per));

  return (
    <MenuBarExtra icon={Icon.Clipboard} tooltip="Charon Clipboard">
      {!isHelperEnabled() ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="Enable Clipboard Helper…"
            icon={Icon.Power}
            onAction={() => launchCommand({ name: "enable-helper", type: LaunchType.UserInitiated })}
          />
        </MenuBarExtra.Section>
      ) : null}
      <MenuBarExtra.Section title="History">
        {history.slice(0, inline).map((h, i) => item(h, i + 1))}
        {groups.map((g, gi) => {
          const start = inline + gi * per + 1;
          return (
            <MenuBarExtra.Submenu key={`g${gi}`} title={`${start} - ${start + per - 1}`}>
              {g.map((h, i) => item(h, start + i))}
            </MenuBarExtra.Submenu>
          );
        })}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Snippets">
        {folders.map((f) => (
          <MenuBarExtra.Submenu key={f.id} title={f.title}>
            {f.snippets.length === 0 ? <MenuBarExtra.Item title="(No Snippets)" /> : null}
            {f.snippets.map((s) => (
              <MenuBarExtra.Item
                key={s.id}
                title={s.title}
                tooltip={s.content.slice(0, 200)}
                onAction={() => Clipboard.paste(s.content)}
              />
            ))}
          </MenuBarExtra.Submenu>
        ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Clear History"
          onAction={() => launchCommand({ name: "clear-history", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Edit Snippets…"
          onAction={() => launchCommand({ name: "manage-snippets", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item title="Preferences…" onAction={() => openExtensionPreferences()} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
