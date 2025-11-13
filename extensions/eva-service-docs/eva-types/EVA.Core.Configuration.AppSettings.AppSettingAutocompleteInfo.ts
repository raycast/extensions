import { z } from 'zod';

const __ConfigurationAppSettingsAppSettingAutocompleteInfoSchema = z.object({
  Converted: z.boolean().optional(),
  DataType: z.string().optional(),
  Default: z.string().optional(),
  Description: z.string().optional(),
  Name: z.string().optional(),
  Options: z.array(z.string()).optional(),
});
export const ConfigurationAppSettingsAppSettingAutocompleteInfoSchema = __ConfigurationAppSettingsAppSettingAutocompleteInfoSchema;


