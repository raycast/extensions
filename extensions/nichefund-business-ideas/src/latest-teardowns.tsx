import { Action, ActionPanel, List } from "@raycast/api";
import { useState } from "react";
import { useTeardowns } from "./api";
import TeardownDetail from "./teardown-detail";
import { Teardown } from "./types";
import { registrationUrl, teardownUrl } from "./urls";

const categories = [
  "",
  "Automotive",
  "Beauty & Personal Care",
  "Childcare",
  "Creative Services",
  "Developer Tools & Infrastructure",
  "E-commerce & Retail",
  "Education",
  "Events & Entertainment",
  "Field Services",
  "Food & Hospitality",
  "Health & Fitness",
  "Non-profit",
  "Other",
  "Pet Care",
  "Professional Services",
  "Property Management",
  "Small Business",
];

export default function LatestTeardowns() {
  const [category, setCategory] = useState("");
  const {
    data = [],
    isLoading,
    pagination,
  } = useTeardowns(category || undefined);

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      searchBarPlaceholder="Search teardowns"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by category"
          value={category}
          onChange={setCategory}
        >
          {categories.map((value) => (
            <List.Dropdown.Item
              key={value || "all"}
              title={value || "All Categories"}
              value={value}
            />
          ))}
        </List.Dropdown>
      }
    >
      {data.map((teardown: Teardown) => (
        <List.Item
          key={teardown.slug}
          title={teardown.title}
          subtitle={teardown.excerpt}
          accessories={[
            { tag: teardown.category },
            { text: `${teardown.score.toFixed(1)}/10` },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Preview Teardown"
                target={<TeardownDetail teardown={teardown} source="latest" />}
              />
              <Action.OpenInBrowser
                title="Read Full Teardown"
                url={teardownUrl(teardown, "latest")}
              />
              <Action.OpenInBrowser
                title="Explore Validated Ideas Free"
                url={registrationUrl("latest")}
              />
              <Action.CopyToClipboard
                title="Copy Teardown Link"
                content={teardownUrl(teardown, "latest")}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
