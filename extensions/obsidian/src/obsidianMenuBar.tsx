import { Icon, MenuBarExtra, open, Clipboard } from "@raycast/api";
import React from "react";
import { ObsidianIconDynamicBold } from "./utils/constants";
import { Vault } from "./utils/interfaces";
import { getPinnedNotes, unpinNote } from "./utils/pinNoteUtils";
import {
  getDailyNoteTarget,
  getOpenPathInObsidianTarget,
  sortNoteByAlphabet,
  useObsidianVaults,
  vaultPluginCheck,
} from "./utils/utils";

function PinnedNotesList(props: { vault: Vault; key: string }) {
  const pinnedNotes = getPinnedNotes(props.vault).sort(sortNoteByAlphabet);
  const { vault } = props;
  const [withPlugin, _] = vaultPluginCheck([vault], "obsidian-advanced-uri");
  return (
    <MenuBarExtra.Submenu title="Pinned Notes" key={"Pinned Notes"}>
      {pinnedNotes.map((note) => (
        <MenuBarExtra.Submenu
          title={note.title}
          key={note.path}
          //shortcut={{ modifiers: ["opt"], key: pinnedNotes.indexOf(note).toString() as Keyboard.KeyEquivalent }}
        >
          <MenuBarExtra.Item
            title="Open in Obsidian"
            icon={ObsidianIconDynamicBold}
            tooltip="Opens this note in Obsidian"
            onAction={() => open(getOpenPathInObsidianTarget(note.path))}
            key={"open"}
          />
          {withPlugin.length == 1 ? (
            <MenuBarExtra.Item
              title="Open in new Pane"
              icon={ObsidianIconDynamicBold}
              tooltip="Opens this note in a new pane"
              onAction={() =>
                open(
                  "obsidian://advanced-uri?vault=" +
                    encodeURIComponent(vault.name) +
                    "&filepath=" +
                    encodeURIComponent(note.path.replace(vault.path, "")) +
                    "&newpane=true"
                )
              }
            />
          ) : null}
          <MenuBarExtra.Item
            title="Copy Content"
            icon={Icon.CopyClipboard}
            tooltip="Copies the content of this note to the clipboard"
            onAction={() => Clipboard.copy(note.content)}
            key={"copy"}
          />
          <MenuBarExtra.Item
            title="Paste Content"
            icon={Icon.CopyClipboard}
            tooltip="Pastes the content of this note to the current application"
            onAction={() => Clipboard.paste(note.content)}
            key={"paste"}
          />
          <MenuBarExtra.Item
            title="Unpin Note"
            icon={Icon.PinDisabled}
            tooltip="Unpins this note"
            onAction={() => unpinNote(note, vault)}
            key={"unpin"}
          />
        </MenuBarExtra.Submenu>
      ))}
    </MenuBarExtra.Submenu>
  );
}

function VaultSection(props: { vault: Vault; key: string; dailyNote: boolean }) {
  const { vault } = props;

  return (
    <React.Fragment>
      <MenuBarExtra.Item title={vault.name} key={vault.path + "Heading"} />
      <PinnedNotesList vault={vault} key={vault.path + "List"} />
      {props.dailyNote && (
        <MenuBarExtra.Item
          title="Daily Note"
          key={vault.path + "Daily Note"}
          tooltip="Open Daily Note"
          onAction={() => open(getDailyNoteTarget(vault))}
        />
      )}
      <MenuBarExtra.Separator />
    </React.Fragment>
  );
}

export default function Command() {
  const { ready, vaults } = useObsidianVaults();

  if (!ready) {
    return <MenuBarExtra isLoading={true} />;
  } else {
    const [vaultsWithPlugin, vaultsWithoutPlugin] = vaultPluginCheck(vaults, "obsidian-advanced-uri");

    return (
      <MenuBarExtra icon={ObsidianIconDynamicBold} tooltip="Obsidian">
        {vaults?.map((vault: Vault) => {
          return <VaultSection vault={vault} key={vault.path} dailyNote={vaultsWithPlugin.includes(vault)} />;
        })}
      </MenuBarExtra>
    );
  }
}
