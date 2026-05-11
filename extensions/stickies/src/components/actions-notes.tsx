import { MutatePromise } from "@raycast/utils";
import { StickiesNote, showStickies } from "../utils/stickies-utils";
import {
  Action,
  ActionPanel,
  Application,
  Clipboard,
  Icon,
  openCommandPreferences,
  openExtensionPreferences,
  showHUD,
} from "@raycast/api";
import { primaryAction } from "../types/preference";

export function ActionsNotes(props: {
  stickiesNote: StickiesNote;
  frontmostApps: { data: Application[] };
  mutate: MutatePromise<StickiesNote[] | undefined, StickiesNote[] | undefined>;
}) {
  const { stickiesNote, frontmostApps, mutate } = props;
  enum PrimaryAction {
    PASTE = "Paste",
    Copy = "Copy",
  }

  const pasteAppActionTitle = () => {
    if (frontmostApps && frontmostApps.data && frontmostApps.data.length > 0) {
      return "Paste to " + frontmostApps.data[0].name;
    }
    return "Paste to Frontmost App";
  };
  const pasteAppActionIcon = () => {
    if (frontmostApps && frontmostApps.data && frontmostApps.data.length > 0) {
      return { fileIcon: frontmostApps.data[0].path };
    }
    return Icon.AppWindow;
  };
  return (
    <ActionPanel>
      <Action
        title={primaryAction === PrimaryAction.PASTE ? pasteAppActionTitle() : "Copy to Clipboard"}
        icon={primaryAction === PrimaryAction.PASTE ? pasteAppActionIcon() : Icon.Clipboard}
        onAction={async () => {
          if (primaryAction === PrimaryAction.PASTE) {
            await Clipboard.paste(stickiesNote.content);
            await showHUD(`📝 Pasted to  ${frontmostApps.data[0].name}`);
          } else {
            await Clipboard.copy(stickiesNote.content);
            await showHUD(`📋 Copied to clipboard`);
          }
          await mutate();
        }}
      />
      <Action
        title={primaryAction === PrimaryAction.PASTE ? "Copy to Clipboard" : pasteAppActionTitle()}
        icon={primaryAction === PrimaryAction.PASTE ? Icon.Clipboard : pasteAppActionIcon()}
        onAction={async () => {
          if (primaryAction === PrimaryAction.PASTE) {
            await Clipboard.copy(stickiesNote.content);
            await showHUD(`📋 Copied to clipboard`);
          } else {
            await Clipboard.paste(stickiesNote.content);
            await showHUD(`📝 Pasted to  ${frontmostApps.data[0].name}`);
          }
          await mutate();
        }}
      />
      <Action.CreateSnippet
        icon={Icon.Snippets}
        shortcut={{ modifiers: ["cmd"], key: "s" }}
        snippet={{ name: stickiesNote.title, text: stickiesNote.content }}
      />
      <ActionPanel.Section>
        <Action.ToggleQuickLook shortcut={{ modifiers: ["cmd"], key: "y" }} />
        <Action
          title={"Refresh Stickies"}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          icon={Icon.Repeat}
          onAction={mutate}
        />
        <Action
          title={"Show Stickies Window"}
          icon={Icon.AppWindowList}
          shortcut={{ modifiers: ["shift", "cmd"], key: "s" }}
          onAction={async () => {
            await showStickies();
          }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title={"Configure Command"}
          shortcut={{ modifiers: ["shift", "cmd"], key: "," }}
          icon={Icon.Gear}
          onAction={openCommandPreferences}
        />
        <Action
          title={"Configure Extension"}
          shortcut={{ modifiers: ["opt", "cmd"], key: "," }}
          icon={Icon.Gear}
          onAction={openExtensionPreferences}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
