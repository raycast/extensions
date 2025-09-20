import { openExtensionPreferences, ActionPanel, Action, Grid, Icon, getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";

import { useState, ReactNode } from "react";

import { walletPath, fetchFiles, fetchPocketNames, purgePreviews } from "./utils";
import { Card, Pocket, Preferences } from "./types";

let savedPockets: Pocket[];

export default function Command() {
  const [pocket, setPocket] = useState<string>();
  const {
    isLoading: isGridLoading,
    data: gridData,
    revalidate: revalidateGrid,
  } = usePromise(loadGridComponents, [pocket]);
  const {
    isLoading: isDropdownLoading,
    data: dropdownData,
    revalidate: revalidateDropdown,
  } = usePromise(loadDropdownComponents);

  return (
    <Grid
      columns={5}
      isLoading={isGridLoading}
      inset={Grid.Inset.Large}
      searchBarPlaceholder={`Search ${gridData?.cardCount || 0} Card${(gridData?.cardCount || 0) != 1 ? "s" : ""}`}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Select Pocket"
          storeValue={getPreferenceValues<Preferences>().rememberPocketFilter}
          onChange={(newValue) => setPocket(newValue)}
          defaultValue="All Cards"
          key="Dropdown"
          isLoading={isDropdownLoading}
        >
          {dropdownData}
        </Grid.Dropdown>
      }
      actions={<ActionPanel>{loadGenericActionNodes()}</ActionPanel>}
    >
      {gridData?.pocketNodes}
    </Grid>
  );

  async function loadGridComponents(sortedPocket?: string) {
    if (!savedPockets) {
      savedPockets = await fetchFiles();
    }
    const pockets = savedPockets;

    const pocketNodes: ReactNode[] = [];
    let cardCount = 0;

    if (sortedPocket) {
      let pocket;

      if (sortedPocket == ".unsorted") {
        pocket = pockets.find((pocket) => !pocket.name);
      } else {
        pocket = pockets.find((pocket) => pocket.name == sortedPocket);
      }

      if (pocket) {
        pocketNodes.push(loadPocketNodes(pocket, { hideTitle: true }));
        cardCount = pocket.cards.length;
      }
    } else {
      pockets.forEach((pocket) => {
        pocketNodes.push(loadPocketNodes(pocket));
        cardCount += pocket.cards.length;
      });
    }

    pocketNodes.push(
      <Grid.EmptyView
        title="No Cards Found"
        key="Empty View"
        description="Use ⌘E to add images to the Wallet directory!"
      />
    );

    return { pocketNodes, cardCount };
  }

  function loadPocketNodes(pocket: Pocket, config?: { hideTitle?: boolean }) {
    return (
      <Grid.Section
        title={config?.hideTitle ? undefined : pocket?.name?.replaceAll(":", "/") || undefined}
        key={pocket.name || ".unsorted"}
      >
        {pocket.cards.map((card) => (
          <Grid.Item
            key={card.path}
            content={card.preview ?? { fileIcon: card.path }}
            title={card.name.replaceAll(":", "/")}
            keywords={[card.name]}
            actions={loadCardActionNodes(card)}
            quickLook={{ name: card.name, path: card.path }}
          />
        ))}
      </Grid.Section>
    );
  }

  async function loadDropdownComponents() {
    const pocketNames = fetchPocketNames();

    return [
      <Grid.Dropdown.Item title="All Cards" value="" key="" icon={Icon.Wallet} />,
      <Grid.Dropdown.Item title="Unsorted" value=".unsorted" key=".unsorted" icon={Icon.Filter} />,
      <Grid.Dropdown.Section title="Pockets" key="Section">
        {pocketNames.map((name) => (
          <Grid.Dropdown.Item title={name.replaceAll(":", "/")} value={name} key={name} />
        ))}
      </Grid.Dropdown.Section>,
    ];
  }

  function loadCardActionNodes(item: Card) {
    return (
      <ActionPanel>
        <ActionPanel.Section>
          <Action.Paste content={{ file: item.path }} />
          <Action.CopyToClipboard content={{ file: item.path }} />
          <Action.ToggleQuickLook shortcut={{ modifiers: ["cmd"], key: "y" }} />
          <Action.ShowInFinder path={item.path} shortcut={{ modifiers: ["cmd"], key: "o" }} />
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
          title="Change Wallet Directory"
          icon={Icon.Folder}
          shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
          onAction={openExtensionPreferences}
        />
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={revalidate}
        />
        <Action
          title="Reset Video Previews"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          onAction={purgeRevalidate}
        />
      </ActionPanel.Section>
    );
  }

  async function revalidate() {
    savedPockets = await fetchFiles();
    revalidateGrid();
    revalidateDropdown();
  }

  function purgeRevalidate() {
    purgePreviews();
    revalidate();
  }
}
