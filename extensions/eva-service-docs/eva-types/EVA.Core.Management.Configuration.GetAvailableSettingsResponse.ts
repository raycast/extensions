import { z } from 'zod';
import { ServiceErrorSchema } from './EVA.Core.ServiceError';
import { ResponseMessageMetadataSchema } from './EVA.Core.ResponseMessageMetadata';
import { ConfigurationGetAvailableSettingsResponse_SettingSchema } from './EVA.Core.Management.Configuration.GetAvailableSettingsResponse+Setting';

const __GetAvailableSettingsResponseSchema = z.object({
  Error: ServiceErrorSchema.optional(),
  Metadata: ResponseMessageMetadataSchema.optional(),
  Settings: z.array(ConfigurationGetAvailableSettingsResponse_SettingSchema).optional(),
});
export const GetAvailableSettingsResponseSchema = __GetAvailableSettingsResponseSchema;


