import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { Dataset, otDatasets } from "./ot_datasets";
import { useCachedPromise } from "@raycast/utils";
import { useState, FC } from "react";

const ListDetail: FC<{ dataset: Dataset }> = ({ dataset }) => (
  <List.Item.Detail
    metadata={
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label title="Schema" />
        <List.Item.Detail.Metadata.Separator />
        {dataset.schema_fields.map((field, i) => {
          return (
            <List.Item.Detail.Metadata.Label
              key={`${field.name}-field-${i}`}
              title={field.name}
              icon={
                field.nullable === true
                  ? Icon.Checkmark
                  : Icon.XMarkCircleFilled
              }
              text={
                typeof field.type === "string" ? field.type : field.type.type
              }
            />
          );
        })}
      </List.Item.Detail.Metadata>
    }
  />
);

export default function Command() {
  const { data, isLoading } = useCachedPromise(
    () => new Promise<Dataset[]>((resolve) => resolve(otDatasets))
  );
  const [filter, setFilter] = useState<string>("all");
  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarAccessory={
        <List.Dropdown
          tooltip="Show posts filter"
          onChange={(newValue) => setFilter(newValue)}
        >
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Platform" value="platform" />
          <List.Dropdown.Item title="Genetics" value="genetics" />
          <List.Dropdown.Item title="Genetics (dev)" value="genetics-dev" />
        </List.Dropdown>
      }
      searchBarPlaceholder="Search a dataset in Open Targets..."
    >
      {data &&
        data
          .filter((dataset) => {
            if (filter === "all") {
              return true;
            }
            return dataset.type.includes(filter);
          })
          .map((dataset) => {
            return (
              <List.Item
                key={dataset.name}
                title={dataset.name}
                icon={Icon.Tag}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard
                      title="Copy location in GCS"
                      content={dataset.location}
                    />
                    <Action.OpenInBrowser
                      title="Open in FTP"
                      // open in browser if ftp is defined, otherwise show message in Raycast
                      url={dataset.ftp ? dataset.ftp : "No FTP available"}
                    />
                  </ActionPanel>
                }
                detail={<ListDetail dataset={dataset} />}
              />
            );
          })}
    </List>
  );
}
