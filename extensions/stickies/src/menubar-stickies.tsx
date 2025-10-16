import { Icon, launchCommand, LaunchType, MenuBarExtra, openCommandPreferences } from "@raycast/api";
import { useStickies } from "./hooks/useStickies";
import { useMemo } from "react";
import { primaryAction, showMenubarTitle } from "./types/preference";
import { firstLine, handleClipboardOperation } from "./utils/common-utils";
import { showStickies } from "./utils/stickies-utils";

export default function MenubarStickies() {
  const { data: strickiesNotesData, isLoading } = useStickies();

  const stickiesNotes = useMemo(() => {
    if (!strickiesNotesData) return [];
    return strickiesNotesData;
  }, [strickiesNotesData]);

  return (
    <MenuBarExtra isLoading={isLoading} icon={Icon.QuoteBlock} title={showMenubarTitle ? firstLine(stickiesNotes) : ""}>
      {stickiesNotes.map((note) => (
        <MenuBarExtra.Section key={"note_" + note.path}>
          <MenuBarExtra.Section>
            <MenuBarExtra.Item title={note.title} icon={Icon.QuoteBlock} />
          </MenuBarExtra.Section>
          <MenuBarExtra.Item
            title={note.content}
            onAction={async (event) => {
              const isCopyAction = primaryAction === "Copy";
              const isLeftClick = event.type === "left-click";
              if ((isCopyAction && isLeftClick) || (!isCopyAction && !isLeftClick)) {
                await handleClipboardOperation("copy", note.content, "📋 Copied to clipboard");
              } else {
                await handleClipboardOperation("paste", note.content, "📝 Pasted to active app");
              }
            }}
          />
        </MenuBarExtra.Section>
      ))}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={"Search Stickies"}
          shortcut={{ modifiers: ["shift", "cmd"], key: "f" }}
          onAction={async () => {
            await launchCommand({ name: "search-stickies", type: LaunchType.UserInitiated });
          }}
        />
        <MenuBarExtra.Item
          title={"Show Stickies Window"}
          shortcut={{ modifiers: ["shift", "cmd"], key: "s" }}
          onAction={async () => {
            await showStickies();
          }}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={"Settings..."}
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={async () => {
            await openCommandPreferences();
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
