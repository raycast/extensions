import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import {
  ArrOrObj,
  DomainDNSGetHostsResult,
  DomainDNSGetListResult,
  DomainGetListResult,
  ErrorCall,
  NCResponse,
} from "./types";
import * as xml2js from "xml2js";
import { parseBooleans } from "xml2js/lib/processors";

function isErrorCall(result: NCResponse<unknown>): result is ErrorCall {
  return result.ApiResponse.$.Status === "ERROR";
}

const { Sandbox, ...preferences } = getPreferenceValues<Preferences>();
const ApiUrl = Sandbox ? `https://api.sandbox.namecheap.com/xml.response` : `https://api.namecheap.com/xml.response`;

const generateUrl = (command: string, params?: Record<string, string>) =>
  ApiUrl +
  "?" +
  new URLSearchParams({
    ...preferences,
    Command: `namecheap.${command}`,
    ...params,
  });
const parseResponse = async (response: Response) => {
  const xml = await response.text();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: NCResponse<any> = await xml2js.parseStringPromise(xml, {
    explicitArray: false,
    attrValueProcessors: [parseBooleans],
  });
  if (isErrorCall(result))
    throw new Error(result.ApiResponse.Errors.Error._, { cause: result.ApiResponse.Errors.Error.$.Number });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { $: _, ...rest } = result.ApiResponse.CommandResponse;
  return rest;
};

const parseAsArray = <T>(res: ArrOrObj<T>) => (res instanceof Array ? res : [res]);

export const useListDomains = () =>
  useFetch(generateUrl("domains.getList"), {
    parseResponse,
    mapResult(result: DomainGetListResult) {
      const data = parseAsArray(result.DomainGetListResult.Domain).map((domain) => domain.$);
      return {
        data,
      };
    },
    initialData: [],
    failureToastOptions: {
      title: "Failed to fetch domains",
    },
  });

export const useListDomainDNSServers = (SLD: string, TLD: string) =>
  useFetch(generateUrl("domains.dns.getList", { SLD, TLD }), {
    parseResponse,
    mapResult(result: DomainDNSGetListResult) {
      const data = result.DomainDNSGetListResult;
      return {
        data,
      };
    },
    failureToastOptions: {
      title: "Failed to fetch domain dns servers",
    },
  });

export const useListDomainDNSHosts = (SLD: string, TLD: string) =>
  useFetch(generateUrl("domains.dns.getHosts", { SLD, TLD }), {
    parseResponse,
    mapResult(result: DomainDNSGetHostsResult) {
      const data = parseAsArray(result.DomainDNSGetHostsResult.host).map((host) => host.$);
      return {
        data,
      };
    },
    initialData: [],
    failureToastOptions: {
      title: "Failed to fetch domain dns hosts",
    },
  });
