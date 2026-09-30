import { ActionPanel, Action, List, LocalStorage, useNavigation, showToast, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { defaultExplorer, explorers } from "./explorers";
import { Explorer } from "./interfaces";

export default function Command() {
  const [selectedExplorer, setSelectedExplorer] = useState<Explorer | null>(null);
  useEffect(() => {
    const setFromStorage = async () => {
      const selectedExplorerFromStorage = await LocalStorage.getItem<string>("selected-explorer");
      if (selectedExplorerFromStorage) {
        try {
          const parsedExplorer: Explorer = JSON.parse(selectedExplorerFromStorage);
          setSelectedExplorer(parsedExplorer);
        } catch (error) {
          setSelectedExplorer(defaultExplorer);
          // don't show to user, they can't do anything actionable
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
    <List isShowingDetail searchBarPlaceholder="Search for an Explorer">
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
        if (explorer?.testNet) {
          keywords.push("testnet");
        } else {
          keywords.push("mainnet");
        }
        return (
          <List.Item
            key={explorer.chainName}
            title={explorer.chainName}
            icon={{ source: explorer.iconUri }}
            keywords={keywords}
            accessories={accessories}
            detail={
              <List.Item.Detail
                markdown={`# ${explorer.chainName}\n[${explorer.baseUrl}](https://${explorer.baseUrl})\n![](${explorer.imageUrl})`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Explorer Name" text={explorer.explorerName} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Currency" text={explorer.currency} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Chain ID" text={explorer.chainId.toString()} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Network Type"
                      text={explorer.testNet ? "Testnet" : "Mainnet"}
                    />
                    <List.Item.Detail.Metadata.Separator />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={`https://${explorer.baseUrl}`} />
                <Action
                  icon={Icon.TwoArrowsClockwise}
                  title={"Change Explorer"}
                  onAction={() => handleExplorerChange(explorer)}
                />
                <Action.CopyToClipboard
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                  content={`https://${explorer.baseUrl}`}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
