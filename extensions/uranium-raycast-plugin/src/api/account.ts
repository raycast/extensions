import { GetCurrentUserRequestDto, GetCurrentUserResponseDto } from "./types";
import { createInstanceGateway, createRouter } from "./apiClient";

export const accountApiRouter = createRouter({
  getMe: (data: GetCurrentUserRequestDto, ...params) =>
    createInstanceGateway<GetCurrentUserResponseDto>(
      {
        url: "/clients-account/me",
        method: "POST",
        data,
      },
      ...params,
    ),
});
