import { z } from 'zod';

const __GetAvailableSettingsSchema = z.object({
  Functionality: z.string().optional(),
});
export const GetAvailableSettingsSchema = __GetAvailableSettingsSchema;


