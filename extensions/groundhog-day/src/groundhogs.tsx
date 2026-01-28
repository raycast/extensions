import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";
import { Groundhog, GroundhogsResponse } from "./types";
import { useState } from "react";

const BASE_URL = "https://groundhog-day.com/";
const API_URL = BASE_URL + "api/v1/";

export default function Groundhogs() {
  const [isShowingDetail, setIsShowingDetail] = useCachedState("isShowingDetail", false);
  const [filter, setFilter] = useState("");
  const { isLoading, data } = useFetch(API_URL + "groundhogs", {
    mapResult(result: GroundhogsResponse) {
      return {
        data: result.groundhogs,
      };
    },
    keepPreviousData: true,
    initialData: [],
  });

  const groundhogs = !filter
    ? data
    : data.filter((groundhog) => {
        if (filter === "is_groundhog") return groundhog.isGroundhog;
        if (filter === "is_not_groundhog") return !groundhog.isGroundhog;
      });

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" onChange={setFilter}>
          <List.Dropdown.Item title="All" value="" icon={Icon.Dot} />
          <List.Dropdown.Section>
            <List.Dropdown.Item icon={Icon.Check} title="IS Groundhog" value="is_groundhog" />
            <List.Dropdown.Item icon={Icon.Multiply} title="IS NOT Groundhog" value="is_not_groundhog" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.Section title={`${data.length} Total Groundhogs`}>
        {groundhogs.map((groundhog) => {
          const latestPrediction = groundhog.predictions.at(-1);
          return (
            <List.Item
              key={groundhog.id}
              title={groundhog.name}
              icon={latestPrediction?.shadow === 0 ? Icon.Sun : Icon.Snowflake}
              subtitle={isShowingDetail ? undefined : groundhog.region}
              accessories={
                isShowingDetail
                  ? undefined
                  : [
                      { tag: `${groundhog.country === "Canada" ? "🇨🇦" : "🇺🇸"} ${groundhog.country}` },
                      { text: `${groundhog.predictionsCount} predictions` },
                    ]
              }
              detail={
                <List.Item.Detail
                  markdown={`![Illustration](${groundhog.image})
${groundhog.description}

## Resides in
${groundhog.region}, ${groundhog.city}, ${groundhog.country}

${latestPrediction ? `In ${latestPrediction.year}, ${groundhog.shortname} predicted ${latestPrediction.shadow === 1 ? "more winter" : latestPrediction.shadow === 0 ? "an early spring" : "N/A"}.` : ""}
`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Name" text={groundhog.name} />
                      <List.Item.Detail.Metadata.Link
                        title="Link"
                        text={`${BASE_URL}groundhogs/${groundhog.slug}`}
                        target={`${BASE_URL}groundhogs/${groundhog.slug}`}
                      />
                      <List.Item.Detail.Metadata.Label title="Short Name" text={groundhog.shortname} />
                      <List.Item.Detail.Metadata.Label title="City" text={groundhog.city} />
                      <List.Item.Detail.Metadata.Label title="Region" text={groundhog.region} />
                      <List.Item.Detail.Metadata.Label title="Country" text={groundhog.country} />
                      <List.Item.Detail.Metadata.Label title="Coordinates" text={groundhog.coordinates} />
                      <List.Item.Detail.Metadata.Link
                        title="Source"
                        text={groundhog.source}
                        target={groundhog.source}
                      />
                      {groundhog.contact ? (
                        <List.Item.Detail.Metadata.Link
                          title="Contact"
                          text={groundhog.contact}
                          target={groundhog.contact.includes("@") ? `mailto:${groundhog.contact}` : groundhog.contact}
                        />
                      ) : (
                        <List.Item.Detail.Metadata.Label title="Contact" icon={Icon.Minus} />
                      )}
                      <List.Item.Detail.Metadata.Link
                        title="Current Prediction"
                        text={groundhog.currentPrediction}
                        target={groundhog.currentPrediction}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Is Groundhog"
                        icon={groundhog.isGroundhog ? Icon.Check : Icon.Multiply}
                      />
                      <List.Item.Detail.Metadata.TagList title="Type">
                        <List.Item.Detail.Metadata.TagList.Item text={groundhog.type} />
                      </List.Item.Detail.Metadata.TagList>
                      <List.Item.Detail.Metadata.Label
                        title="Active"
                        icon={groundhog.active ? Icon.Check : Icon.Multiply}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Successor"
                        text={groundhog.successor}
                        icon={groundhog.successor ? undefined : Icon.Minus}
                      />
                      <List.Item.Detail.Metadata.Label title="Description" text={groundhog.description} />
                      <List.Item.Detail.Metadata.Link title="Image" text={groundhog.image} target={groundhog.image} />
                      <List.Item.Detail.Metadata.Label
                        title="Predictions"
                        text={groundhog.predictionsCount.toString()}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Toggle Details"
                    icon={Icon.Sidebar}
                    onAction={() => setIsShowingDetail((prev) => !prev)}
                  />
                  <Action.Push
                    title="View Predictions"
                    icon={Icon.Document}
                    target={<ViewPredictions groundhog={groundhog} />}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

function ViewPredictions({ groundhog }: { groundhog: Groundhog }) {
  const markdown = `${groundhog.name} / Past predictions

| Year | Shadow | Details |
|------|--------|---------|
${groundhog.predictions
  .toReversed()
  .map((prediction) => {
    const shadowText = prediction.shadow === 1 ? "Yes, saw shadow" : prediction.shadow === 0 ? "Nope, no shadow" : "";
    const detailsText =
      prediction.details ||
      (prediction.shadow === 1 ? "❄️ More winter" : prediction.shadow === 0 ? "🌼 Early spring" : "");
    return `| ${prediction.year} | ${shadowText} | ${detailsText} |`;
  })
  .join("\n")}
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy All as Markdown" content={markdown} />
          <Action.CopyToClipboard title="Copy All as JSON" content={JSON.stringify(groundhog.predictions)} />
        </ActionPanel>
      }
    />
  );
}
