import { ActionPanel, Action, List, LocalStorage, useNavigation, showToast, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { Explorer, SupportedChain } from "./interfaces";
import { defaultExplorer, explorers } from "./explorers";
import axios from "axios";

export async function getExplorers() {
  const explorers: Explorer[] = [];
  const response = await axios.get(
    "https://celatone-api-feat-add-search-and-supported-netwo-h3giweexeq-as.a.run.app/v1/supported_networks",
  );
  const supportedChains: SupportedChain[] = response.data;
  for (const supportedChain of supportedChains) {
    for (const supportedNetwork of Object.values(supportedChain.networks)) {
      explorers.push({
        chainName: supportedChain.chain + " (" + supportedNetwork.network + ")",
        networkName: supportedNetwork.network,
        explorerName: "Celatone" + " " + supportedChain.chain, // Assuming you meant chain here
        baseUrl: supportedChain.url + "/" + supportedNetwork.network,
        chainId: supportedNetwork.network, // Assuming chainId is same as network, adjust if needed
        imageUrl: "", // Add image url here
        iconUri: "https://assets.alleslabs.dev/celatone-brand/logo/celatone_symbol_black_on_white.svg", // Add icon url here
      });
    }
  }
  return explorers;
}

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
    <List isShowingDetail searchBarPlaceholder="Search for an Explorer" isLoading={explorers.length === 0}>
      {explorers.map((explorer) => {
        const accessories = [];
        const keywords = [explorer.explorerName, explorer.chainId.toString()];
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
                    <List.Item.Detail.Metadata.Label title="Chain ID" text={explorer.chainId.toString()} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={`${explorer.baseUrl}`} />
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
