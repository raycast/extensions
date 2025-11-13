import { createEvaServiceHook } from "../fetch-eva";
import { GetAppSettingsAutocompleteInfoSchema } from "@eva-types/EVA.Core.Management.Configuration.GetAppSettingsAutocompleteInfo";
import { GetAppSettingsAutocompleteInfoResponseSchema } from "@eva-types/EVA.Core.Management.Configuration.GetAppSettingsAutocompleteInfoResponse";

export const useGetAppSettingsAutocompleteInfo = createEvaServiceHook({
  serviceName: "GetAppSettingsAutocompleteInfo",
  requestSchema: GetAppSettingsAutocompleteInfoSchema,
  responseSchema: GetAppSettingsAutocompleteInfoResponseSchema,
});
