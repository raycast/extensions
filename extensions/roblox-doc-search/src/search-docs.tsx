import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  getPreferenceValues,
} from "@raycast/api";
import { useEffect, useState, useMemo } from "react";

interface Member {
  Name: string;
  MemberType: string;
  Tags?: string[];
}

interface RobloxItem {
  Name: string;
  ClassName: string;
  Type: string;
  Icon: string;
  IsDeprecated: boolean;
  Members?: Member[];
  Tags?: string[];
}

interface JSonData {
  Classes: RobloxItem[];
  Enums: RobloxItem[];
}

const preferences = getPreferenceValues<ExtensionPreferences>();

export default function Command() {
  const [isSearching, setIsSearching] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [data, setData] = useState<RobloxItem[]>([]);

  useEffect(() => {
    async function init() {
      setIsSearching(true);
      try {
        const url =
          "https://raw.githubusercontent.com/MaximumADHD/Roblox-Client-Tracker/refs/heads/roblox/API-Dump.json";
        const response: Response = await fetch(url);
        const jsonData = (await response.json()) as JSonData;

        const allItems: RobloxItem[] = [];

        jsonData.Classes.forEach((rbxClass) => {
          allItems.push({
            Name: rbxClass.Name,
            ClassName: rbxClass.Name,
            Type: "Class",
            Icon: `https://cdn.jsdelivr.net/gh/MaximumADHD/Roblox-Client-Tracker/QtResources/icons/Dark/Roblox/16/2x/${rbxClass.Name}.png`,
            IsDeprecated: rbxClass.Tags?.includes("Deprecated") ?? false,
          });

          if (rbxClass.Members) {
            rbxClass.Members.forEach((member) => {
              allItems.push({
                Name: member.Name,
                ClassName: rbxClass.Name,
                Type: member.MemberType,
                Icon: `https://cdn.jsdelivr.net/gh/MaximumADHD/Roblox-Client-Tracker/QtResources/icons/Dark/Roblox/16/2x/${rbxClass.Name}.png`,
                IsDeprecated: member.Tags?.includes("Deprecated") ?? false,
              });
            });
          }
        });

        jsonData.Enums.forEach((rbxEnum) => {
          allItems.push({
            Name: rbxEnum.Name,
            ClassName: "",
            Type: "Enum",
            Icon: "",
            IsDeprecated: false,
          });
        });

        setData(allItems);
      } catch (error) {
        console.error("Fetch failed", error);
        setData([]);
      } finally {
        setIsSearching(false);
      }
    }
    init();
  }, []);

  const preferenceData = useMemo(() => {
    return data.filter((item) => {
      if (!preferences.showDeprecated) {
        return !item.IsDeprecated;
      } else return item;
    });
  }, [data]);

  const filteredData = useMemo(() => {
    if (!searchText)
      return preferenceData
        .sort((a: RobloxItem, b: RobloxItem) => a.Name.localeCompare(b.Name))
        .slice(0, 100);

    const query = searchText.toLowerCase();

    return preferenceData
      .filter((item) => item.Name.toLowerCase().includes(query))
      .sort((a: RobloxItem, b: RobloxItem) => {
        const aName = a.Name.toLowerCase();
        const bName = b.Name.toLowerCase();

        if (aName === query) return -1;
        if (bName === query) return 1;

        const aStarts = aName.startsWith(query);
        const bStarts = bName.startsWith(query);
        if (aStarts && !bStarts) return -1;
        if (bStarts && !aStarts) return 1;

        return aName.length - bName.length;
      })
      .slice(0, 100);
  }, [searchText, preferenceData]);

  return (
    <List
      isLoading={isSearching}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Classes, Properties, Functions..."
      throttle
    >
      <List.Section title={`Showing ${filteredData.length} results`}>
        {filteredData.length > 0 ? (
          filteredData.map((item, index) => (
            <List.Item
              key={index}
              title={item.Name}
              subtitle={
                item.Type === "Class"
                  ? ""
                  : item.Type === "Enum"
                    ? ""
                    : `in ${item.ClassName}`
              }
              icon={{
                source: item.Icon || "placeholder.png",
              }}
              accessories={[
                {
                  tag: {
                    value: item.Type,
                    color: getTypeColor(item.Type),
                  },
                  tooltip: `Type: ${item.Type}`,
                  icon: getMemberIcon(item.Type),
                },
                {
                  tag: {
                    value: item.IsDeprecated ? "Deprecated" : "",
                    color: Color.Red,
                  },
                  tooltip: "This item is deprecated",
                  icon: item.IsDeprecated ? Icon.ExclamationMark : undefined,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={generateDocUrl(item)} />
                  <Action.CopyToClipboard
                    content={item.Name}
                    title="Copy Name"
                  />
                  <Action.CopyToClipboard
                    content={generateDocUrl(item)}
                    title="Copy Link"
                  />
                </ActionPanel>
              }
            />
          ))
        ) : (
          <List.EmptyView title="No results" />
        )}
      </List.Section>
    </List>
  );
}

function getMemberIcon(type: string) {
  switch (type) {
    case "Function":
      return Icon.CodeBlock;
    case "Property":
      return Icon.List;
    case "Event":
      return Icon.Bolt;
    case "Enum":
      return Icon.BulletPoints;
    default:
      return Icon.Box;
  }
}

function getTypeColor(type: string) {
  switch (type) {
    case "Class":
      return Color.Green;
    case "Function":
      return Color.Purple;
    case "Property":
      return Color.Blue;
    case "Event":
      return Color.Yellow;
    case "Enum":
      return Color.Orange;
    default:
      return Color.SecondaryText;
  }
}

function generateDocUrl(item: RobloxItem) {
  const baseUrl = "https://create.roblox.com/docs/reference/engine";
  if (item.Type === "Class") {
    return `${baseUrl}/classes/${item.Name}`;
  } else if (item.Type === "Enum") {
    return `${baseUrl}/enums/${item.Name}`;
  }
  return `${baseUrl}/classes/${item.ClassName}#${item.Name}`;
}
