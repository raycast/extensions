import { UserContractsResponseDto, CreateUserContractRequestDto, CreateUserContractResponseDto } from "./types";
import { createInstanceGateway, createRouter } from "./apiClient";

export const contractsApiRouter = createRouter({
  list: (_, ...params) =>
    createInstanceGateway<UserContractsResponseDto>(
      {
        url: "/contracts/list",
        method: "GET",
      },
      ...params,
    ),
  create: (data: CreateUserContractRequestDto, ...params) =>
    createInstanceGateway<CreateUserContractResponseDto>(
      {
        url: "/contracts/create",
        method: "POST",
        data,
      },
      ...params,
    ),
  // TODO: Implement when API details are available
  getById: (_contractId: string, ..._params) => {
    throw new Error("TODO: Implement contracts.getById when API specification is available");
  },
});
