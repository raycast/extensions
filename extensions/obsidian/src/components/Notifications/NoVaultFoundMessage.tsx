import { Detail } from "@raycast/api";

export function NoVaultFoundMessage() {
  const text =
    "# No vaults found\n\n Please use Obsidian to create a vault, or set a vault path in the extension's preferences before using this command.";
  return <Detail markdown={text} />;
}
