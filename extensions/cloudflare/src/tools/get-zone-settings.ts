import { getCloudflareService, withCloudflareAccessToken } from '../oauth';
import {
  formatZoneSettingValue,
  ZONE_SETTING_DEFINITIONS,
} from '../insights-utils';
import { resolveZone } from './helpers';

interface Input {
  /** Zone ID returned by List Zones. */
  zoneId: string;
}

async function tool(input: Input) {
  const context = await resolveZone(input.zoneId);
  const settings = await getCloudflareService().getZoneSettings(
    context.zone.id,
    ZONE_SETTING_DEFINITIONS.map((setting) => setting.id),
  );
  return {
    accountId: context.account.id,
    accountName: context.account.name,
    zoneId: context.zone.id,
    zoneName: context.zone.name,
    settings: settings.map((setting) => ({
      id: setting.id,
      name:
        ZONE_SETTING_DEFINITIONS.find(
          (definition) => definition.id === setting.id,
        )?.title ?? setting.id,
      value: formatZoneSettingValue(setting.value),
      editable: setting.editable,
      modifiedOn: setting.modifiedOn,
    })),
  };
}

export default withCloudflareAccessToken(tool);
