import { Action, ActionPanel, Color, Icon, List } from '@raycast/api';
import { useCachedPromise } from '@raycast/utils';
import {
  formatZoneSettingValue,
  ZONE_SETTING_DEFINITIONS,
} from './insights-utils';
import { getCloudflareService, withCloudflareAccessToken } from './oauth';
import { handleNetworkError } from './utils';
import {
  ZoneResourceContext,
  ZoneResourcePicker,
} from './zone-resource-picker';

function SettingsView({ context }: { context: ZoneResourceContext }) {
  const { isLoading, data: settings = [] } = useCachedPromise(
    async () =>
      getCloudflareService().getZoneSettings(
        context.zone.id,
        ZONE_SETTING_DEFINITIONS.map((setting) => setting.id),
      ),
    [],
    { onError: handleNetworkError },
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle={`${context.zone.name} Settings`}
      searchBarPlaceholder="Search zone settings"
    >
      {settings.map((setting) => {
        const definition = ZONE_SETTING_DEFINITIONS.find(
          (candidate) => candidate.id === setting.id,
        );
        const value = formatZoneSettingValue(setting.value);
        return (
          <List.Item
            key={setting.id}
            icon={Icon.Gear}
            title={definition?.title ?? setting.id}
            subtitle={value}
            keywords={[setting.id]}
            accessories={[
              {
                tag: {
                  value: setting.editable ? 'Editable' : 'Read Only',
                  color: setting.editable ? Color.Green : Color.SecondaryText,
                },
              },
            ]}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Setting"
                      text={definition?.title ?? setting.id}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Value"
                      text={value}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Setting ID"
                      text={setting.id}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Can Be Edited"
                      text={setting.editable ? 'Yes' : 'No'}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Last Modified"
                      text={
                        setting.modifiedOn
                          ? new Date(setting.modifiedOn).toLocaleString()
                          : 'Not provided'
                      }
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Setting Value"
                  content={value}
                />
                <Action.CopyToClipboard
                  title="Copy Setting ID"
                  content={setting.id}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function Command() {
  return (
    <ZoneResourcePicker
      actionTitle="Show Zone Settings"
      icon={Icon.Gear}
      renderTarget={(context) => <SettingsView context={context} />}
    />
  );
}

export default withCloudflareAccessToken(Command);
