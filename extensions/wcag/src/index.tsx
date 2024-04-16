import { useState } from "react";
import { ActionPanel, List, Action } from "@raycast/api";
import wcag from "wcag-as-json/wcag.json";
import type { SuccessCriteria, Wcag } from "../types/wcag";

export default function Command() {
  const levelTypes = ["A", "AA", "AAA"];
  const successCriteria = extractSuccessCriteria(wcag);
  const [items, setItems] = useState(successCriteria);

  function onLevelTypeChange(newValue: string) {
    if (newValue === "") {
      setItems(successCriteria);
    } else {
      setItems(successCriteria.filter((item) => item.level === newValue));
    }
  }

  return (
    <List
      searchBarPlaceholder="Search Success Criteria"
      searchBarAccessory={LevelDropdown({ levelTypes, onLevelTypeChange })}
    >
      {items.map((item) => (
        <List.Item
          key={item.ref_id}
          title={`${item.ref_id} ${item.title}`}
          subtitle={item.description}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={item.url} title="Open Guideline in Browser" />
            </ActionPanel>
          }
          accessories={[{ tag: item.level }]}
        />
      ))}
    </List>
  );
}

function LevelDropdown(props: { levelTypes: string[]; onLevelTypeChange: (newValue: string) => void }) {
  const { levelTypes, onLevelTypeChange } = props;
  return (
    <List.Dropdown
      tooltip="Select Level"
      storeValue={false}
      onChange={(newValue) => {
        onLevelTypeChange(newValue);
      }}
    >
      <List.Dropdown.Item key="all" title="All Conformance Levels" value="" />
      {levelTypes.map((levelType: string) => (
        <List.Dropdown.Item key={levelType} title={levelType} value={levelType} />
      ))}
    </List.Dropdown>
  );
}

function extractSuccessCriteria(wcagData: Wcag[]) {
  const successCriteria: SuccessCriteria[] = [];

  wcagData.forEach((item) => {
    item.guidelines?.forEach((guideline) => {
      guideline.success_criteria?.forEach((criteria) => {
        successCriteria.push({
          ref_id: criteria.ref_id,
          title: criteria.title,
          description: criteria.description,
          url: criteria.url,
          level: criteria.level,
        });
      });
    });
  });

  return successCriteria;
}
