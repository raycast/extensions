import { MenuBarExtra, open } from "@raycast/api";
import { vaultPluginCheck } from "./api/vault/plugins/plugins.service";
import { Vault } from "./api/vault/vault.types";
import { ObsidianIcon } from "./utils/constants";
import { useNotes, useObsidianVaults } from "./utils/hooks";
import { getObsidianTarget, ObsidianTargetType } from "./utils/utils";

function BookmarkedNotesList(props: { vault: Vault }) {
  const [notes] = useNotes(props.vault, true);
  return (
    <MenuBarExtra.Submenu title={props.vault.name} key={props.vault.path + "Bookmarked Notes"}>
      {notes.map((note) => (
        <MenuBarExtra.Item
          title={note.title}
          key={note.path}
          tooltip="Open Note"
          icon={ObsidianIcon}
          onAction={() => open(getObsidianTarget({ type: ObsidianTargetType.OpenPath, path: note.path }))}
        />
      ))}
    </MenuBarExtra.Submenu>
  );
}

function BookmarkedNotesVaultSelection(props: { vaults: Vault[] }) {
  return (
    <MenuBarExtra.Submenu title="Bookmarked Notes" key={"Bookmarked Notes"}>
      {props.vaults.map((vault) => (
        <BookmarkedNotesList vault={vault} key={vault.path + "Bookmarked Notes"} />
      ))}
    </MenuBarExtra.Submenu>
  );
}

function DailyNoteVaultSelection(props: { vaults: Vault[] }) {
  const [withPlugin] = vaultPluginCheck(props.vaults, "obsidian-advanced-uri");
  return (
    <MenuBarExtra.Submenu title="Daily Note" key={"Daily Note"}>
      {withPlugin.map((vault) => (
        <MenuBarExtra.Item
          title={vault.name}
          key={vault.path + "Daily Note"}
          tooltip="Open Daily Note"
          onAction={() => open(getObsidianTarget({ type: ObsidianTargetType.DailyNote, vault: vault }))}
        />
      ))}
    </MenuBarExtra.Submenu>
  );
}

function OpenVaultSelection(props: { vaults: Vault[] }) {
  return (
    <MenuBarExtra.Submenu title="Open Vault" key={"Open Vault"}>
      {props.vaults.map((vault) => (
        <MenuBarExtra.Item
          title={vault.name}
          key={vault.path}
          tooltip="Open Vault"
          onAction={() => open(getObsidianTarget({ type: ObsidianTargetType.OpenVault, vault: vault }))}
        />
      ))}
    </MenuBarExtra.Submenu>
  );
}

function ObsidianMenuBar(props: { vaults: Vault[] }) {
  return (
    <MenuBarExtra icon={ObsidianIcon} tooltip="Obsidian">
      <DailyNoteVaultSelection vaults={props.vaults} />
      <OpenVaultSelection vaults={props.vaults} />
      <BookmarkedNotesVaultSelection vaults={props.vaults} />
    </MenuBarExtra>
  );
}

export default function Command() {
  const { ready, vaults } = useObsidianVaults();

  if (!ready) {
    return <MenuBarExtra isLoading={true} />;
  } else {
    return <ObsidianMenuBar vaults={vaults} />;
  }
}
