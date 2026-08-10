import { AppRoute, ApiRouteResponse, AppRouter } from "@ts-rest/core";

// REMOVE WHEN THIS PR WILL BE MERGERD
// https://github.com/ts-rest/ts-rest/pull/189

export type ApiResponseForRoute<T extends AppRoute> = ApiRouteResponse<T["responses"]>;

// takes a router and returns response types for each AppRoute
// does not support nested routers, yet

export function getRouteResponses<T extends AppRouter>(router: T) {
  return {} as {
    [K in keyof typeof router]: (typeof router)[K] extends AppRoute
      ? ApiResponseForRoute<(typeof router)[K]>
      : "not a route";
  };
}
