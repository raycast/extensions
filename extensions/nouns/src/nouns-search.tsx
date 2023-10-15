import { useState, useEffect, useMemo } from "react";
import { Action, ActionPanel, Detail, Grid, Icon, showToast, Toast } from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";
import { Data, NounStats, TraitCategories, traits } from "./traits";
import { getNounsFromStorage, Noun, removeNounFromStorage, setNounToStorage } from "./storage";

const traitCategories: Record<TraitCategories, string> = {
  all: "All",
  noun_id: "Noun ID",
  background: "Background",
  body: "Body",
  accessory: "Accessory",
  glasses: "Glasses",
  head: "Head",
};

export default function Command() {
  const { data: rawNounsData, isLoading } = useFetch<Data>(
    "https://7tedfll1w4.execute-api.us-east-2.amazonaws.com/Prod/rarity-stats",
    { keepPreviousData: true }
  );

  const [searchTerm, setSearchTerm] = useState<string | undefined>(undefined);
  const [category, setCategory] = useCachedState<TraitCategories>("category", "all");
  const [pinnedNouns, setPinnedNouns] = useCachedState<Noun[]>("pinned-nouns", []);

  useEffect(() => {
    (async () => {
      const pinnedNounsStorage = await getNounsFromStorage();
      setPinnedNouns(pinnedNounsStorage);
    })();
  }, []);

  useEffect(() => {
    setSearchTerm("");
  }, [category]);

  let nounData: NounStats[] = rawNounsData?.noun_stats || [];

  const isAll = category === "all";
  const searchHints = traits[category].map((t) => t.label);
  const randomHints = useMemo(() => getRandomSearchHints(searchHints), [category]);

  let searchPlaceholder: string;
  if (isAll) {
    searchPlaceholder = "Eg: peahcy blue nigiri";
  } else if (category === "noun_id") {
    searchPlaceholder = "Eg: #209";
  } else {
    searchPlaceholder = `Eg: ${randomHints}`;
  }

  if (!isAll && searchTerm && category) {
    const strictMatchTrait = traits[category].find((trait) => {
      if (isNumeric(searchTerm)) {
        return trait.id === Number(searchTerm);
      }

      const label = trait.label.toLowerCase().replace(" ", "");
      const search = searchTerm.toLowerCase().replace(" ", "");
      return label === search;
    });

    let searchTermIds: number[] = [];

    if (strictMatchTrait) {
      searchTermIds = [strictMatchTrait.id];
    } else {
      searchTermIds = traits[category]
        .filter((trait) => {
          const label = trait.label.toLowerCase().replace(" ", "");
          const search = searchTerm.toLowerCase().replace(" ", "");
          if (label === search) {
            return true;
          }
          return label.includes(search);
        })
        .map((trait) => trait.id);
    }

    const result = rawNounsData?.noun_stats.filter((noun) => {
      if (category === "noun_id") {
        return noun[category] === Number(searchTerm);
      }
      return searchTermIds.some((id) => id === noun[category]);
    });

    nounData = result || [];
  }

  const children = nounData.map((noun) => {
    const nounId = String(noun.noun_id);
    const isPinned = pinnedNouns.some((n) => n.id === nounId);
    return (
      <Grid.Item
        key={noun.noun_id}
        actions={
          <ActionPanel>
            <Action.Push icon={Icon.Sidebar} title="View Noun Detail" target={<NounDetail {...noun} />} />
            <Action.CopyToClipboard title="Copy Noun ID" content={noun.noun_id} />
            <Action
              title={isPinned ? "Remove from Menu Bar" : "Add to Menu Bar"}
              icon={isPinned ? Icon.Minus : Icon.Plus}
              onAction={async () => {
                let updatedNouns;
                if (isPinned) {
                  updatedNouns = await removeNounFromStorage(nounId);
                  showToast({ style: Toast.Style.Success, title: `Noun #${nounId} added to the Menu Bar!` });
                } else {
                  updatedNouns = await setNounToStorage(nounId);
                  showToast({ style: Toast.Style.Success, title: `Noun #${nounId} removed to the Menu Bar!` });
                }
                setPinnedNouns(updatedNouns);
              }}
            />
            <Action.OpenInBrowser
              title="Open on OpenSea"
              url={`https://opensea.io/assets/ethereum/0x9c8ff314c9bc7f6e59a9d9225fb22946427edc03/${noun.noun_id}`}
            />
            <Action.OpenInBrowser title="Open Noun PNG" url={`https://noun.pics/${noun.noun_id}`} />
            <Action.OpenInBrowser title="Open Noun SVG" url={`https://noun.pics/${noun.noun_id}.svg`} />
          </ActionPanel>
        }
        title={isAll ? `Noun #${noun.noun_id} — ${getAllTraitLabels(noun)}` : traitCategories[category]}
        subtitle={
          isAll
            ? undefined
            : traits[category].filter((trait) => trait.id === noun[category])[0]?.label || `#${noun.noun_id}`
        }
        keywords={isAll ? getAllTraitLabels(noun) : []}
        content={`https://noun.pics/${noun.noun_id}`}
      />
    );
  });

  return (
    <Grid
      itemSize={isAll ? Grid.ItemSize.Small : Grid.ItemSize.Medium}
      isLoading={isLoading}
      searchBarPlaceholder={searchPlaceholder}
      searchText={isAll ? undefined : searchTerm}
      onSearchTextChange={isAll ? undefined : setSearchTerm}
      throttle
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Search By"
          defaultValue={category}
          onChange={(newValue) => {
            setCategory(newValue as TraitCategories);
          }}
        >
          {Object.entries(traitCategories).map((entry) => (
            <Grid.Dropdown.Item key={entry[0]} title={entry[1]} value={entry[0]} />
          ))}
        </Grid.Dropdown>
      }
    >
      {isAll ? (
        children
      ) : (
        <Grid.Section title={`Found ${nounData.length} Noun${nounData.length > 1 ? "s" : ""}`}>{children}</Grid.Section>
      )}
    </Grid>
  );
}

function NounDetail({ noun_id, background, body, accessory, head, glasses }: NounStats) {
  const backgroundLabel = traits.background[background] ? traits.background[background].label : "Unknown";
  const bodyLabel = traits.body[body] ? traits.body[body].label : "Unknown";
  const accessoryLabel = traits.accessory[accessory] ? traits.accessory[accessory].label : "Unknown";
  const headLabel = traits.head[head] ? traits.head[head].label : "Unknown";
  const glassesLabel = traits.glasses[glasses] ? traits.glasses[glasses].label : "Unknown";

  return (
    <Detail
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Noun ID" content={noun_id} />
          <Action.OpenInBrowser
            title="Open on OpenSea"
            url={`https://opensea.io/assets/ethereum/0x9c8ff314c9bc7f6e59a9d9225fb22946427edc03/${noun_id}`}
          />
          <Action.OpenInBrowser title="Open Noun PNG" url={`https://noun.pics/${noun_id}`} />
          <Action.OpenInBrowser title="Open Noun SVG" url={`https://noun.pics/${noun_id}.svg`} />
        </ActionPanel>
      }
      navigationTitle={`Detail for Noun #${noun_id}`}
      markdown={`<img src="https://noun.pics/${noun_id}"/>`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Noun ID" text={`#${noun_id}`} />
          <Detail.Metadata.Label title="Background" text={`${backgroundLabel} (${background})`} />
          <Detail.Metadata.Label title="Body" text={`${bodyLabel} (${body})`} />
          <Detail.Metadata.Label title="Accessory" text={`${accessoryLabel} (${accessory})`} />
          <Detail.Metadata.Label title="Head" text={`${headLabel} (${head})`} />
          <Detail.Metadata.Label title="Glasses" text={`${glassesLabel} (${glasses})`} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link
            title="Open on..."
            text="OpenSea"
            target={`https://opensea.io/assets/ethereum/0x9c8ff314c9bc7f6e59a9d9225fb22946427edc03/${noun_id}`}
          />
          <Detail.Metadata.Link title="Open image..." text="as PNG" target={`https://noun.pics/${noun_id}`} />
          <Detail.Metadata.Link title="Open image..." text="as SVG" target={`https://noun.pics/${noun_id}.svg`} />
        </Detail.Metadata>
      }
    />
  );
}

const getAllTraitLabels = ({ background, body, accessory, head, glasses }: NounStats) => {
  const keywords = [
    traits.background[background] ? "background: " + traits.background[background].label : "",
    traits.body[body] ? "body: " + traits.body[body].label : "",
    traits.accessory[accessory] ? "accessory: " + traits.accessory[accessory].label : "",
    traits.head[head] ? "head: " + traits.head[head].label : "",
    traits.glasses[glasses] ? "glasses: " + traits.glasses[glasses].label : "",
  ].join(" ");

  return [keywords];
};

function getRandomSearchHints(hints: string[]) {
  return shuffleArray(hints)
    .map((h) => `"${h}"`)
    .slice(0, 3)
    .join(", ")
    .replace(/, ([^,]*)$/, " or $1");
}

function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function isNumeric(value: string) {
  return /^-?\d+$/.test(value);
}
