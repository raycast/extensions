import https from "node:https";
import { getPreferenceValues } from "@raycast/api";
import axios, { AxiosError } from "axios";
import { OutBoundMode } from "./types.js";

/**
 * @link https://manual.nssurge.com/others/http-api.html
 */
export default function (xKey: string, port: string) {
  const preferences = getPreferenceValues();
  const host = preferences.host || "127.0.0.1";
  const protocol = preferences.tls_enabled ? "https" : "http";
  const api = axios.create({
    baseURL: `${protocol}://${xKey}@${host}:${port}`,
    headers: { "X-Key": xKey },
    httpsAgent: new https.Agent({
      rejectUnauthorized: false,
    }),
  });

  return {
    async isMacOSVersion() {
      try {
        await this.getSystemProxyStatus();
        return true;
      } catch (err) {
        if (err instanceof AxiosError && err.response?.status === 404) {
          return false;
        }
        throw err;
      }
    },

    getOutboundMode() {
      return api({
        method: "get",
        url: "/v1/outbound",
      });
    },

    getPolicyGroups() {
      return api({
        method: "get",
        url: "/v1/policy_groups",
      });
    },

    getSelectOptionFromPolicyGroup(groupName: string) {
      return api({
        method: "get",
        url: "/v1/policy_groups/select",
        params: {
          group_name: groupName,
        },
      });
    },

    getSystemProxyStatus() {
      return api({
        method: "get",
        url: "/v1/features/system_proxy",
      });
    },

    getEnhancedMode() {
      return api({
        method: "get",
        url: "/v1/features/enhanced_mode",
      });
    },

    getHttpCaptureStatus() {
      return api({
        method: "get",
        url: "/v1/features/capture",
      });
    },

    getMitmStatus() {
      return api({
        method: "get",
        url: "/v1/features/mitm",
      });
    },

    getRewriteStatus() {
      return api({
        method: "get",
        url: "/v1/features/rewrite",
      });
    },

    getScriptingStatus() {
      return api({
        method: "get",
        url: "/v1/features/scripting",
      });
    },

    getProfile() {
      return api({
        method: "get",
        url: "/v1/profiles/current",
      });
    },

    getProfiles() {
      return api({
        method: "get",
        url: "/v1/profiles",
      });
    },

    changeOutboundMode(mode: OutBoundMode) {
      return api({
        method: "post",
        url: "/v1/outbound",
        data: { mode },
      });
    },

    changeOptionOfGroup(groupName: string, option: string) {
      return api({
        method: "post",
        url: "/v1/policy_groups/select",
        data: {
          group_name: groupName,
          policy: option,
        },
      });
    },

    changeSystemProxyStatus(status: boolean) {
      return api({
        method: "post",
        url: "/v1/features/system_proxy",
        data: { enabled: status },
      });
    },

    changeEnhancedMode(status: boolean) {
      return api({
        method: "post",
        url: "/v1/features/enhanced_mode",
        data: { enabled: status },
      });
    },

    changeHttpCaptureStatus(status: boolean) {
      return api({
        method: "post",
        url: "/v1/features/capture",
        data: { enabled: status },
      });
    },

    changeMitmStatus(status: boolean) {
      return api({
        method: "post",
        url: "/v1/features/mitm",
        data: { enabled: status },
      });
    },

    changeRewriteStatus(status: boolean) {
      return api({
        method: "post",
        url: "/v1/features/rewrite",
        data: { enabled: status },
      });
    },

    changeScriptingStatus(status: boolean) {
      return api({
        method: "post",
        url: "/v1/features/scripting",
        data: { enabled: status },
      });
    },

    changeProfile(profile: string) {
      return api({
        method: "post",
        url: "/v1/profiles/switch",
        data: { name: profile },
      });
    },

    reloadProfile() {
      return api({
        method: "post",
        url: "/v1/profiles/reload",
      });
    },

    flushDnsCache() {
      return api({
        method: "post",
        url: "/v1/dns/flush",
      });
    },
  };
}
