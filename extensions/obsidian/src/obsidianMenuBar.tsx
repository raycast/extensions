import { MenuBarExtra, open } from "@raycast/api";
import { Obsidian, ObsidianTargetType, ObsidianVault, Note } from "@/obsidian";
import { ObsidianIcon } from "./utils/constants";
import { useObsidianVaults, useVaultPluginCheck } from "./utils/hooks";

function BookmarkedNotesList(props: { vault: ObsidianVault }) {
  const notes: Note[] = [];
  return (
    <MenuBarExtra.Submenu title={props.vault.name} key={props.vault.path + "Bookmarked Notes"}>
      {notes.map((note) => (
        <MenuBarExtra.Item
          title={note.title}
          key={note.path}
          tooltip="Open Note"
          icon={ObsidianIcon}
          onAction={() => open(Obsidian.getTarget({ type: ObsidianTargetType.OpenPath, path: note.path }))}
        />
      ))}
    </MenuBarExtra.Submenu>
  );
}

function BookmarkedNotesVaultSelection(props: { vaults: ObsidianVault[] }) {
  return (
    <MenuBarExtra.Submenu title="Bookmarked Notes" key={"Bookmarked Notes"}>
      {props.vaults.map((vault) => (
        <BookmarkedNotesList vault={vault} key={vault.path + "Bookmarked Notes"} />
      ))}
    </MenuBarExtra.Submenu>
  );
}

function DailyNoteVaultSelection(props: { vaults: ObsidianVault[] }) {
  const { vaultsWithPlugin } = useVaultPluginCheck({
    vaults: props.vaults,
    communityPlugins: ["obsidian-advanced-uri"],
    corePlugins: ["daily-notes"],
  });
  return (
    <MenuBarExtra.Submenu title="Daily Note" key={"Daily Note"}>
      {vaultsWithPlugin.map((vault) => (
        <MenuBarExtra.Item
          title={vault.name}
          key={vault.path + "Daily Note"}
          tooltip="Open Daily Note"
          onAction={() => open(Obsidian.getTarget({ type: ObsidianTargetType.DailyNote, vault: vault }))}
        />
      ))}
    </MenuBarExtra.Submenu>
  );
}

function OpenVaultSelection(props: { vaults: ObsidianVault[] }) {
  return (
    <MenuBarExtra.Submenu title="Open Vault" key={"Open Vault"}>
      {props.vaults.map((vault) => (
        <MenuBarExtra.Item
          title={vault.name}
          key={vault.path}
          tooltip="Open Vault"
          onAction={() => open(Obsidian.getTarget({ type: ObsidianTargetType.OpenVault, vault: vault }))}
        />
      ))}
    </MenuBarExtra.Submenu>
  );
}

function ObsidianMenuBar(props: { vaults: ObsidianVault[] }) {
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
