import { Action, ActionPanel, List, Icon, Detail, Color } from "@raycast/api";
import { useFrecencySorting } from "@raycast/utils";

import { AppSettingWithId } from "./types/core";
import { transformDefaultValue } from "./utils";
import { useGetAppSettingsAutocompleteInfo } from "./lib/eva-services/app-settings";

export default function Command() {
  const { data, isLoading } = useGetAppSettingsAutocompleteInfo({});

  const { data: sortedData, visitItem } = useFrecencySorting(
    data?.Settings?.map((setting) => ({ ...setting, id: setting.Name ?? "" })).filter((s) => s.id) ?? []
  );

  return (
    <List isLoading={isLoading} navigationTitle="Find EVA App setting">
      {sortedData.map((appSetting) => (
        <List.Item
          key={appSetting.id}
          title={appSetting.Name!}
          accessories={[{ icon: { source: Icon.Info, tintColor: Color.Blue } }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Details"
                target={<Details appSetting={appSetting as AppSettingWithId} />}
                onPush={() => visitItem(appSetting)}
              />
              <Action.CopyToClipboard
                title="Copy Key"
                content={appSetting.Name!}
                onCopy={() => visitItem(appSetting)}
              />
            </ActionPanel>
          }
          subtitle={appSetting.DataType}
        />
      ))}
    </List>
  );
}

const DetailsMetaData = ({ appSetting: appSetting }: { appSetting: AppSettingWithId }) => {
  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Type" text={appSetting.DataType} />
    </Detail.Metadata>
  );
};

const Details = ({ appSetting }: { appSetting: AppSettingWithId }) => {
  const markDown = `
  # ${appSetting.Name}
  ${appSetting.Description ?? "No description available"}

  ## Default value
  \`${transformDefaultValue(appSetting?.Default)}\`
  `;

  return (
    <Detail
      navigationTitle={appSetting.Name}
      markdown={markDown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Key" content={appSetting.Name ?? ""} />
          {transformDefaultValue(appSetting?.Default) === "-" ? null : (
            <Action.CopyToClipboard title="Copy Default Value" content={transformDefaultValue(appSetting?.Default)} />
          )}
        </ActionPanel>
      }
      metadata={<DetailsMetaData appSetting={appSetting} />}
    />
  );
};
