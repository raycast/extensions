import { ActionPanel, Action, List, LocalStorage, useNavigation, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { explorers } from "./explorers";
import { Explorer } from "./interfaces";

export default function Command() {
  // Grab the clipboard contents and run a search
  const [selectedExplorer, setSelectedExplorer] = useState<Explorer | null>(null);
  useEffect(() => {
    const setFromStorage = async () => {
      const selectedExplorerFromStorage = await LocalStorage.getItem<string>("selected-explorer");
      if (selectedExplorerFromStorage) {
        try {
          const parsedExplorer: Explorer = JSON.parse(selectedExplorerFromStorage);
          setSelectedExplorer(parsedExplorer);
        } catch (error) {
          console.log(error);
        }
      }
    };
    setFromStorage();
  }, []);

  const { pop } = useNavigation();

  const handleExplorerChange = async (explorer: Explorer) => {
    await LocalStorage.setItem("selected-explorer", JSON.stringify(explorer));
    setSelectedExplorer(explorer);
    pop();
    showToast({ title: "Explorer changed", message: `${explorer.chainName}` });
  };
  return (
    <List isShowingDetail>
      {explorers.map((explorer) => {
        const accessories = [];
        const keywords = [explorer.currency, explorer.explorerName, explorer.chainId.toString()];
        if (selectedExplorer?.chainName === explorer.chainName) {
          accessories.push({
            text: "Selected",
            icon: "✅",
            tooltip: "The explorer used in searches.",
          });
        }
        return (
          <List.Item
            key={explorer.chainName}
            title={explorer.chainName}
            keywords={keywords}
            accessories={accessories}
            detail={
              <List.Item.Detail
                markdown={`# ${explorer.chainName}\n[${explorer.baseUrl}](https://${explorer.baseUrl})\n![](${explorer.imageUrl})`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Explorer Name" text={explorer.explorerName} />
                    <List.Item.Detail.Metadata.Label title="Currency" text={explorer.currency} />
                    <List.Item.Detail.Metadata.Label title="Chain ID" text={explorer.chainId.toString()} />
                    <List.Item.Detail.Metadata.Label title="Testnet" text={explorer.testNet ? "Testnet" : "Mainnet"} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={`https://${explorer.baseUrl}`} />
                <Action title={"Change Explorer"} onAction={() => handleExplorerChange(explorer)} />
                <Action.CopyToClipboard content={`https://${explorer.baseUrl}`} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
