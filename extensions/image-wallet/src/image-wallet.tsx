import { openExtensionPreferences, ActionPanel, Action, Grid, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";

import { useState, ReactNode } from "react";

import { walletPath, fetchFiles } from "./utils";
import { Card, Pocket } from "./types";

export default function Command() {
  const [pocket, setPocket] = useState<string>();
  const { isLoading, data, revalidate } = usePromise(loadGridComponents, [pocket]);

  return (
    <Grid
      columns={5}
      isLoading={isLoading}
      inset={Grid.Inset.Large}
      searchBarPlaceholder={`Search ${data?.cardCount || 0} Cards...`}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Select Pocket"
          storeValue
          onChange={(newValue) => setPocket(newValue)}
          defaultValue="All Cards"
          key="Dropdown"
        >
          {data?.dropdownNodes}
        </Grid.Dropdown>
      }
      actions={<ActionPanel>{loadGenericActionNodes()}</ActionPanel>}
    >
      {data?.pocketNodes}
    </Grid>
  );

  async function loadGridComponents(sortedPocket?: string) {
    return fetchFiles(walletPath).then((pockets) => {
      const dropdownNodes = loadGridDropdownNodes(pockets);
      const pocketNodes: ReactNode[] = [];
      let cardCount = 0;

      if (sortedPocket) {
        pockets.forEach((pocket) => {
          if (pocket.name == sortedPocket) {
            pocketNodes.push(loadPocketNodes(pocket, { hideTitle: true }));
            cardCount += pocket.cards.length;
          }
        });
      } else {
        pocketNodes.push(
          <Grid.EmptyView
            title="No Cards Found"
            key="Empty View"
            description="Use ⌘E to add images to the Wallet directory!"
          />
        );
        pockets.forEach((pocket) => {
          pocketNodes.push(loadPocketNodes(pocket));
          cardCount += pocket.cards.length;
        });
      }

      return { pocketNodes, dropdownNodes, cardCount };
    });
  }

  function loadGridDropdownNodes(pockets: Pocket[]) {
    return [
      <Grid.Dropdown.Item title="All Cards" value="" key="" />,
      <Grid.Dropdown.Section title="Pockets" key="Section">
        {pockets
          .filter((pocket) => pocket.name)
          .map((pocket) => (
            <Grid.Dropdown.Item
              title={pocket.name || "Unsorted"}
              value={pocket.name || "Unsorted"}
              key={pocket.name || "Unsorted"}
            />
          ))}
      </Grid.Dropdown.Section>,
    ];
  }

  function loadPocketNodes(pocket: Pocket, ops?: { hideTitle?: boolean }) {
    return (
      <Grid.Section title={ops?.hideTitle ? undefined : pocket.name || undefined} key={pocket.name || "unsorted"}>
        {pocket.cards.map((card) => (
          <Grid.Item
            key={card.path}
            content={card.path}
            title={card.name.replace(":", "/")}
            keywords={[card.name]}
            actions={loadCardActionNodes(card)}
            quickLook={{ name: card.name, path: card.path }}
          />
        ))}
      </Grid.Section>
    );
  }

  function loadCardActionNodes(item: Card) {
    return (
      <ActionPanel>
        <ActionPanel.Section>
          <Action.Paste content={{ file: item.path }} />
          <Action.CopyToClipboard content={{ file: item.path }} />
          <Action.ToggleQuickLook shortcut={{ modifiers: ["cmd"], key: "y" }} />
        </ActionPanel.Section>
        {loadGenericActionNodes()}
      </ActionPanel>
    );
  }

  function loadGenericActionNodes() {
    return (
      <ActionPanel.Section>
        <Action.ShowInFinder title="Edit Wallet" shortcut={{ modifiers: ["cmd"], key: "e" }} path={walletPath} />
        <Action
          title="Reload Wallet"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={revalidate}
        />
        <Action
          title="Change Wallet Directory"
          icon={Icon.Folder}
          shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
          onAction={openExtensionPreferences}
        />
      </ActionPanel.Section>
    );
  }
}
