import { useEffect, useState } from "react";
import { showHUD, Action, ActionPanel, List, Color, Icon } from "@raycast/api";
import { shellScript } from "./shellScript";
import { useCachedState } from "@raycast/utils";

const THOCK_CLI_PATH = "/opt/homebrew/bin/thock-cli";

const brands = [
  {
    name: "Alps",
    authors: [
      {
        name: "tplai",
        switchSets: [{ name: "SKCM Blue" }],
      },
    ],
  },
  {
    name: "Cherry MX",
    authors: [
      {
        name: "mechvibes",
        switchSets: [
          { name: "Black ABS" },
          { name: "Black PBT" },
          { name: "Blue ABS" },
          { name: "Blue PBT" },
          { name: "Brown ABS" },
          { name: "Brown PBT" },
          { name: "Red ABS" },
          { name: "Red PBT" },
        ],
      },
      {
        name: "tplai",
        switchSets: [{ name: "Black" }, { name: "Blue" }, { name: "Brown" }],
      },
    ],
  },
  {
    name: "Drop",
    authors: [
      {
        name: "tplai",
        switchSets: [{ name: "Holy Panda" }],
      },
    ],
  },
  {
    name: "Durock",
    authors: [
      {
        name: "tplai",
        switchSets: [{ name: "Alpaca" }],
      },
    ],
  },
  {
    name: "Everglide",
    authors: [
      {
        name: "mechvibes",
        switchSets: [{ name: "Crystal Purple" }, { name: "Oreo" }],
      },
    ],
  },
  {
    name: "Gateron",
    authors: [
      {
        name: "tplai",
        switchSets: [{ name: "Ink Black" }, { name: "Ink Red" }, { name: "Turquoise Tealios" }],
      },
    ],
  },
  {
    name: "Kailh",
    authors: [
      {
        name: "tplai",
        switchSets: [{ name: "Box Navy" }],
      },
    ],
  },
  {
    name: "Novelkeys",
    authors: [
      {
        name: "tplai",
        switchSets: [{ name: "Cream" }],
      },
    ],
  },
  {
    name: "Other",
    authors: [
      {
        name: "tplai",
        switchSets: [{ name: "Buckling Spring" }],
      },
      {
        name: "webdevcody",
        switchSets: [{ name: "unknown" }],
      },
    ],
  },
  {
    name: "Topre",
    authors: [
      {
        name: "mechvibes",
        switchSets: [{ name: "Purple Hybrid PBT" }],
      },
      {
        name: "tplai",
        switchSets: [{ name: "Topre" }],
      },
    ],
  },
];
export async function setSwitchSet(brand: string, author: string, switchSet: string) {
  const command = `${THOCK_CLI_PATH} set-mode "${switchSet}" --brand "${brand}" --author "${author}"`;
  const result = await shellScript(command);
  if (result) {
    await showHUD(`Selected ${switchSet} from ${brand} (${author})`);
  }
}
export default function Command() {
  const [searchText, setSearchText] = useState<string>("");
  const [filteredList, setFilteredList] = useState<typeof brands>(brands);
  const [currentSwitchSet, setCurrentSwitchSet] = useCachedState<string>("thock-switch-set", "");

  useEffect(() => {
    const filtered = brands
      .map((brand) => ({
        ...brand,
        authors: brand.authors
          .map((author) => ({
            ...author,
            switchSets: author.switchSets.filter((switchSet) =>
              switchSet.name.toLowerCase().includes(searchText.toLowerCase()),
            ),
          }))
          .filter((author) => author.switchSets.length > 0),
      }))
      .filter((brand) => brand.authors.length > 0);
    setFilteredList(filtered);
  }, [searchText]);
  async function handleAction(brand: string, author: string, switchSet: string) {
    await setSwitchSet(brand, author, switchSet);
    setCurrentSwitchSet(switchSet.toLowerCase());
  }
  return (
    <List
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Select Switch Sets"
      searchBarPlaceholder="Select Switch Set"
    >
      {filteredList.map((brand) => (
        <List.Section key={brand.name} title={`${brand.name}™`}>
          {brand.authors.flatMap((author) =>
            author.switchSets.map((switchSet) => (
              <List.Item
                key={`${brand.name}-${author.name}-${switchSet.name}`}
                title={switchSet.name}
                subtitle={`Author: ${author.name}`}
                accessories={
                  switchSet.name.toLowerCase() === currentSwitchSet
                    ? [{ tag: { value: "Selected", color: Color.Green } }]
                    : []
                }
                actions={
                  <ActionPanel>
                    <Action
                      title="Select"
                      icon={Icon.Keyboard}
                      onAction={() => handleAction(brand.name, author.name, switchSet.name)}
                    />
                  </ActionPanel>
                }
              />
            )),
          )}
        </List.Section>
      ))}
    </List>
  );
}
