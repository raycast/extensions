import { createEvaServiceHook } from "../fetch-eva";
import { GetAvailableSettingsSchema } from "@eva-types/EVA.Core.Management.Configuration.GetAvailableSettings";
import { GetAvailableSettingsResponseSchema } from "@eva-types/EVA.Core.Management.Configuration.GetAvailableSettingsResponse";

export const useGetAvailableSettings = createEvaServiceHook({
  serviceName: "GetAvailableSettings",
  requestSchema: GetAvailableSettingsSchema,
  responseSchema: GetAvailableSettingsResponseSchema,
});
