import { createEvaServiceHook } from "../fetch-eva";
import { GetAvailableServicesSchema } from "@eva-types/EVA.Core.API.GetAvailableServices";
import { GetAvailableServiceDetailsSchema } from "@eva-types/EVA.Core.API.GetAvailableServiceDetails";
import { GetAvailableServicesResponseSchema } from "@eva-types/EVA.Core.API.GetAvailableServicesResponse";
import { GetAvailableServiceDetailsResponseSchema } from "@eva-types/EVA.Core.API.GetAvailableServiceDetailsResponse";

export const useGetAvailableServices = createEvaServiceHook({
  serviceName: "GetAvailableServices",
  requestSchema: GetAvailableServicesSchema,
  responseSchema: GetAvailableServicesResponseSchema,
});

export const useGetAvailableServiceDetails = createEvaServiceHook({
  serviceName: "GetAvailableServiceDetails",
  requestSchema: GetAvailableServiceDetailsSchema,
  responseSchema: GetAvailableServiceDetailsResponseSchema,
});
