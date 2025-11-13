import { Action, ActionPanel, List, Icon, Detail, Color } from "@raycast/api";
import { useFrecencySorting } from "@raycast/utils";

import { SettingWithId, SettingSensitivityTypes } from "./types/core";
import { transformDefaultValue } from "./utils";
import { useGetAvailableSettings } from "./lib/eva-services/settings";

export default function Command() {
  const { data, isLoading } = useGetAvailableSettings({});

  const { data: sortedData, visitItem } = useFrecencySorting(
    data?.Settings?.map((setting) => ({ ...setting, id: setting.Key ?? "" })).filter((s) => s.id) ?? []
  );

  return (
    <List isLoading={isLoading} navigationTitle="Find EVA settings">
      {sortedData.map((setting, index) => (
        <List.Item
          key={`${setting.Key}-${index}`}
          title={setting.Key!}
          accessories={[{ icon: { source: Icon.Info, tintColor: Color.Blue } }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Details"
                target={<Details setting={setting as SettingWithId} />}
                onPush={() => visitItem(setting)}
              />
              <Action.CopyToClipboard title="Copy Key" content={setting.Key!} onCopy={() => visitItem(setting)} />
            </ActionPanel>
          }
          subtitle={setting.Type}
        />
      ))}
    </List>
  );
}

const renderSensitivityValue = (sensitivity: SettingSensitivityTypes) => {
  switch (sensitivity) {
    case SettingSensitivityTypes.Normal:
      return { value: "Normal", color: Color.Green };
    case SettingSensitivityTypes.CloudOnly:
      return { value: "Cloud only", color: Color.Blue };
    case SettingSensitivityTypes.Encrypted:
      return { value: "Encrypted", color: Color.Yellow };
    case SettingSensitivityTypes.Sensitive:
      return { value: "Sensitive", color: Color.Red };
    case SettingSensitivityTypes.Masked:
      return { value: "Masked", color: Color.Purple };
    default:
      return { value: "Unknown", color: Color.SecondaryText };
  }
};

const DetailsMetaData = ({ setting }: { setting: SettingWithId }) => {
  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Type" text={setting.Type} />
      <Detail.Metadata.Label title="Sensitivity" text={renderSensitivityValue(setting.Sensitivity)} />
      <Detail.Metadata.Label
        title="Deprecation"
        text={setting.Deprecation ? { value: setting.Deprecation, color: Color.Red } : "-"}
      />
    </Detail.Metadata>
  );
};

const Details = ({ setting }: { setting: SettingWithId }) => {
  const markDown = `
  # ${setting.Key}
  ${setting.Description ?? "No description available"}

  ## Default value
  \`${transformDefaultValue(setting?.DefaultValue)}\`
  `;

  return (
    <Detail
      navigationTitle={setting.Key}
      markdown={markDown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Key" content={setting.Key ?? ""} />
          {transformDefaultValue(setting?.DefaultValue) === "-" ? null : (
            <Action.CopyToClipboard title="Copy Default Value" content={transformDefaultValue(setting?.DefaultValue)} />
          )}
        </ActionPanel>
      }
      metadata={<DetailsMetaData setting={setting} />}
    />
  );
};
