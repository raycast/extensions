import { ActionPanel, Action, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { planTypes, getFlagEmoji, getRankIcon, sortPlansByCNY } from "./utils";
import { Region } from "./types";

// Main component
export default function Command() {
  const [selectedPlanId, setSelectedPlanId] = useState(0);
  const [sortedRegions, setSortedRegions] = useState<Region[]>([]);

  useFetch<Region[]>("https://api.owo.nz/prices", {
    headers: { "User-Agent": "Raycast Client" },
    parseResponse: (response: Response) => {
      if (!response.ok) {
        throw new Error(response.statusText);
      }

      return response.json();
    },
    mapResult: (data) => {
      const initialSortedData = sortPlansByCNY(data, "50GB");
      setSortedRegions(initialSortedData);
      return {
        data: initialSortedData,
      };
    },
  });

  function handlePlanTypeChange(newValue: string) {
    setSelectedPlanId(Number(newValue));
    const selectedPlanName = planTypes.find((plan) => plan.id === newValue)?.name;
    if (selectedPlanName) {
      const updatedSortedData = sortPlansByCNY(sortedRegions, selectedPlanName);
      setSortedRegions(updatedSortedData);
    }
  }

  return (
    <List
      navigationTitle="Search iCloud+ Global Price"
      searchBarPlaceholder="Search"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select iCloud+ Plan Type"
          storeValue={false}
          onChange={(newValue) => {
            handlePlanTypeChange(newValue);
          }}
        >
          <List.Dropdown.Section title="iCloud+ Plans">
            {planTypes.map((planType) => (
              <List.Dropdown.Item key={planType.id} title={planType.desc} value={planType.id} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {sortedRegions?.map((region) => (
        <List.Item
          key={region.CountryISO}
          keywords={[region.Country, region.CountryISO, region.Currency]}
          icon={getFlagEmoji(region.CountryISO)}
          title={region.Country}
          accessories={[
            { text: region.Plans[selectedPlanId].Price },
            { tag: { color: "#e8fcfd", value: region.Currency } },
            { text: region.Plans[selectedPlanId].PriceInCNY.toFixed(2).toString() },
            { tag: { color: "#b3e1e8", value: "CNY" } },
            { icon: getRankIcon(region.Rank) },
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url="https://icloud.owo.nz/" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
