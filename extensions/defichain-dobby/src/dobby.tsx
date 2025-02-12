import { ActionPanel, Action, Detail } from "@raycast/api";
import { useVaults } from "./useVaults";
import VaultMetadata from "./vaultMetaData";

export default function Command() {
  const { status, vaults, vaultsSummaryMarkdown } = useVaults();

  return (
    <Detail
      isLoading={status === "loading"}
      markdown={vaultsSummaryMarkdown}
      metadata={
        <Detail.Metadata>
          {vaults?.map((v, index) => (
            <VaultMetadata key={v.vaultId} vault={v} no={index} />
          ))}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel title="Dobby">
          <Action.OpenInBrowser
            title="Open Dashboard"
            url="https://defichain-dobby.com"
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        </ActionPanel>
      }
    />
  );
}
