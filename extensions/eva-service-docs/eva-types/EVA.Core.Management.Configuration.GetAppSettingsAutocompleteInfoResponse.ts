import { z } from 'zod';
import { ServiceErrorSchema } from './EVA.Core.ServiceError';
import { ResponseMessageMetadataSchema } from './EVA.Core.ResponseMessageMetadata';
import { ConfigurationAppSettingsAppSettingAutocompleteInfoSchema } from './EVA.Core.Configuration.AppSettings.AppSettingAutocompleteInfo';

const __GetAppSettingsAutocompleteInfoResponseSchema = z.object({
  Error: ServiceErrorSchema.optional(),
  Metadata: ResponseMessageMetadataSchema.optional(),
  Settings: z.array(ConfigurationAppSettingsAppSettingAutocompleteInfoSchema).optional(),
});
export const GetAppSettingsAutocompleteInfoResponseSchema = __GetAppSettingsAutocompleteInfoResponseSchema;


