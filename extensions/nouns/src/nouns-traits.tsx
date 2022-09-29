import { useState, useEffect } from "react";
import { Action, ActionPanel, Detail, Grid } from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";
import { Data, NounStats, Trait, TraitCategories, traits } from "./traits";

const traitCategories: Record<TraitCategories, string> = {
  noun_id: "Noun ID",
  background: "Background",
  body: "Body",
  accessory: "Accessory",
  glasses: "Glasses",
  head: "Head",
};

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

export default function Command() {
  const { data: rawNounsData, isLoading } = useFetch<Data>(
    "https://7tedfll1w4.execute-api.us-east-2.amazonaws.com/Prod/rarity-stats",
    { keepPreviousData: true }
  );

  const [searchTerm, setSearchTerm] = useCachedState("searchTerm", "");
  const [category, setCategory] = useCachedState<TraitCategories>("nounId", "noun_id");
  const [nounData, setNounData] = useCachedState<NounStats[]>("nounData", rawNounsData?.noun_stats || []);

  const searchHints = traits[category].reduce((acc: string[], curr) => {
    acc.push(curr.label);
    return acc;
  }, []);

  const randomHints = shuffleArray(searchHints)
    .map((h) => `"${h}"`)
    .slice(0, 3)
    .join(", ")
    .replace(/, ([^,]*)$/, " or $1");
  useEffect(() => {
    if (rawNounsData && searchTerm && category) {
      // console.log("change");
      // console.log(traits[category].length);
      const searchTermByIndex = traits[category].findIndex((trait: Trait) => {
        if (isNumeric(searchTerm)) {
          return trait.id === Number(searchTerm);
        }

        const label = trait.label.toLowerCase().replace(" ", "");
        const search = searchTerm.toLowerCase().replace(" ", "");
        if (label === search) {
          console.log("here");
          return true;
        }
        // console.log("---");
        // console.log(trait);
        // console.log(label, search);
        return label.includes(search);
      });
      console.log(searchTermByIndex);
      const result = rawNounsData.noun_stats.filter((noun) => {
        if (category === "noun_id") {
          return noun[category] === Number(searchTerm);
        }
        return noun[category] === searchTermByIndex;
      });

      setNounData(result);
    } else {
      setNounData(rawNounsData?.noun_stats || []);
    }
  }, [rawNounsData, category, searchTerm]);

  return (
    <Grid
      navigationTitle={`Showing ${nounData.length} Noun${nounData.length > 1 ? "s" : ""}`}
      isLoading={isLoading}
      enableFiltering={false}
      onSearchTextChange={setSearchTerm}
      searchBarPlaceholder={category === "noun_id" ? "Search for ID..." : `Eg: ${randomHints}`}
      searchText={searchTerm}
      throttle
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Search By"
          defaultValue={category}
          onChange={(newValue) => {
            setCategory(newValue as TraitCategories);
            setSearchTerm("");
          }}
        >
          {Object.entries(traitCategories).map((entry) => (
            <Grid.Dropdown.Item key={entry[0]} title={entry[1]} value={entry[0]} />
          ))}
        </Grid.Dropdown>
      }
    >
      {nounData.map((noun, index) => (
        <Grid.Item
          key={noun.noun_id}
          actions={
            <ActionPanel>
              <Action.Push title="View Detail" target={<NounDetail {...noun} />} />
              <Action.CopyToClipboard title="Copy Noun ID" content={noun.noun_id} />
              <Action.OpenInBrowser
                title="View on OpenSea"
                url={`https://opensea.io/assets/ethereum/0x9c8ff314c9bc7f6e59a9d9225fb22946427edc03/${noun.noun_id}`}
              />
              <Action.OpenInBrowser title="Open image as PNG" url={`https://noun.pics/${noun.noun_id}`} />
              <Action.OpenInBrowser title="Open image as SVG" url={`https://noun.pics/${noun.noun_id}.svg`} />
            </ActionPanel>
          }
          title={`Noun #${noun.noun_id}`}
          subtitle={traits[category].filter((trait) => trait.id === noun[category])[0]?.label}
          content={`https://noun.pics/${noun.noun_id}`}
          // keywords={[
          //   noun.noun_id.toString(),
          //   noun.background.toString(),
          //   noun.body.toString(),
          //   noun.accessory.toString(),
          // ]}
        />
      ))}
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
            title="View on..."
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
