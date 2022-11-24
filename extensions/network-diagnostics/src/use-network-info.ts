import { useReducer } from "react";
import dns from "node:dns";
import { useInterval } from "./hooks";
import {
  defaultRoutes,
  hardwareNetworkDevices,
  LatencyResult,
  NetworkDevices,
  nextHopLatency,
  Route,
  wifiInfo,
  WiFiInfo,
} from "./network-info";
import { ping, PingResult } from "./network-info/ping";
import { publicIp, PublicIpResult } from "./network-info/public-ip";

const REFRESH_INTERVAL = 3000;

export interface NetworkInfo {
  defaultRoutes?: Route[];
  wifiInfo?: WiFiInfo;
  networkDevices?: NetworkDevices;
  gatewayPing?: LatencyResult;
  googlePing?: PingResult;
  publicIp?: PublicIpResult;
  nameservers?: string[];
  errors: Error[];
}

export enum ActionType {
  UpdateDefaultRoutes = "UpdateDefaultRoutes",
  UpdateNetworkDevices = "UpdateNetworkDevices",
  UpdateWifiInfo = "UpdateWifiInfo",
  UpdateGatewayPing = "UpdateGatewayPing",
  UpdateGooglePing = "UpdateGooglePing",
  UpdatePublicIp = "UpdatePublicIp",
  UpdateNameservers = "UpdateNameservers",
  SetErrors = "SetErrors",
}

export type NetworkInfoAction =
  | { type: ActionType.UpdateDefaultRoutes; payload: Route[] }
  | { type: ActionType.UpdateNetworkDevices; payload: NetworkDevices }
  | { type: ActionType.UpdateWifiInfo; payload: WiFiInfo }
  | { type: ActionType.UpdateGatewayPing; payload: LatencyResult }
  | { type: ActionType.UpdateGooglePing; payload: PingResult }
  | { type: ActionType.UpdatePublicIp; payload: PublicIpResult }
  | { type: ActionType.UpdateNameservers; payload: string[] }
  | { type: ActionType.SetErrors; errors: Error[] };

function networkInfoReducer(state: NetworkInfo, action: NetworkInfoAction): NetworkInfo {
  const stateUpdate: Partial<NetworkInfo> = {};

  switch (action.type) {
    case ActionType.UpdateDefaultRoutes:
      stateUpdate.defaultRoutes = action.payload;
      break;

    case ActionType.UpdateNetworkDevices:
      stateUpdate.networkDevices = action.payload;
      break;

    case ActionType.UpdateWifiInfo:
      stateUpdate.wifiInfo = action.payload;
      break;

    case ActionType.UpdateGatewayPing:
      stateUpdate.gatewayPing = action.payload;
      break;

    case ActionType.UpdateGooglePing:
      stateUpdate.googlePing = action.payload;
      break;

    case ActionType.UpdatePublicIp:
      stateUpdate.publicIp = action.payload;
      break;

    case ActionType.UpdateNameservers:
      stateUpdate.nameservers = action.payload;
      break;

    case ActionType.SetErrors:
      stateUpdate.errors = action.errors;
      break;

    default:
      return state;
  }

  return { ...state, ...stateUpdate };
}

export function useNetworkInfo(): { networkInfo: NetworkInfo; refresh: () => void } {
  const [networkInfo, dispatch] = useReducer(networkInfoReducer, {
    errors: [],
  });

  const updateFuncs: (() => Promise<NetworkInfoAction[]>)[] = [
    async () => {
      const [devices, routes] = await Promise.all([hardwareNetworkDevices(), defaultRoutes()]);
      return [
        { type: ActionType.UpdateDefaultRoutes, payload: routes },
        { type: ActionType.UpdateNetworkDevices, payload: devices },
      ];
    },
    async () => [],
    async () => [{ type: ActionType.UpdateWifiInfo, payload: await wifiInfo() }],
    async () => [{ type: ActionType.UpdatePublicIp, payload: await publicIp() }],
    async () => [{ type: ActionType.UpdateGatewayPing, payload: await nextHopLatency() }],
    async () => [{ type: ActionType.UpdateGooglePing, payload: await ping("8.8.8.8") }],
    async () => [{ type: ActionType.UpdateNameservers, payload: dns.getServers() }],
  ];

  const refresh = async () => {
    console.log("Refreshing network info");
    const results = await Promise.allSettled(updateFuncs.map((f) => f()));
    results
      .filter((result): result is PromiseFulfilledResult<NetworkInfoAction[]> => result.status === "fulfilled")
      .map((result) => result.value)
      .flat()
      .map((action) => dispatch(action));

    const errors = results
      .filter((result): result is PromiseRejectedResult => result.status === "rejected")
      .map((result) => result.reason);
    dispatch({ type: ActionType.SetErrors, errors });
  };

  useInterval(refresh, REFRESH_INTERVAL, true);

  return { networkInfo, refresh };
}
