import { z } from 'zod';
import { ConfigurationSettingValueEntityTypesSchema } from './EVA.Core.Configuration.SettingValueEntityTypes';
import { ConfigurationSettingSensitivityTypesSchema } from './EVA.Core.Configuration.SettingSensitivityTypes';

const __ConfigurationGetAvailableSettingsResponse_SettingSchema = z.object({
  AllowMultipleValues: z.boolean(),
  DefaultValue: z.any().optional(),
  Deprecation: z.string().optional(),
  Description: z.string().optional(),
  EntityType: ConfigurationSettingValueEntityTypesSchema.optional(),
  Functionality: z.string().optional(),
  Key: z.string().optional(),
  RootLevelOnly: z.boolean(),
  Sensitivity: ConfigurationSettingSensitivityTypesSchema,
  Type: z.string().optional(),
});
export const ConfigurationGetAvailableSettingsResponse_SettingSchema = __ConfigurationGetAvailableSettingsResponse_SettingSchema;


