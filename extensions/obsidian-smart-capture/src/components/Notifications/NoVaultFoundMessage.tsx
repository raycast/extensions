import { Detail } from "@raycast/api";

export function NoVaultFoundMessage() {
  const text =
    "# No vaults found\n\n Please use Obsidian to create a vault \n\n Download [Obsidian](https://obsidian.md)";
  return <Detail markdown={text} />;
}
