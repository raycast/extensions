import { showToast, Toast } from "@raycast/api";
import { Instance } from "../types";
import { OnTokenRefresh } from "./auth";
import { serviceNowFetchRaw } from "./serviceNowFetch";

// Shown when /sn_devstudio_/v1/get_publish_info rejects the request — sign-in failed.
export function authenticationFailedMessage(instance: Instance): string {
  if (instance.authMode === "oauth") {
    return "Could not authenticate. Re-sign in and verify your OAuth user has the admin role on this instance.";
  }
  return "Could not authenticate. Check your username and password, and that the account has the admin role. If this instance uses SSO, switch this profile to OAuth.";
}

// Shown when sign-in succeeded but the background script never ran (admin-only /sys.scripts.do).
export function backgroundScriptBlockedMessage(instance: Instance): string {
  if (instance.authMode === "oauth") {
    return "The background script could not run. Verify your OAuth user has the admin role on this instance.";
  }
  return "The background script could not run. Check that you have the admin role. If this instance uses SSO, switch this profile to OAuth.";
}

export class ServiceNowClient {
  private instance: Instance;
  private onRefresh?: OnTokenRefresh;
  private sessionData: { ck: string; cookies: string } | null = null;

  constructor(instance: Instance, onRefresh?: OnTokenRefresh) {
    this.instance = instance;
    this.onRefresh = onRefresh;
  }

  async init(): Promise<boolean> {
    this.sessionData = await this.authenticate();
    return this.sessionData !== null;
  }

  async authenticate() {
    try {
      const response = await serviceNowFetchRaw(this.instance, "/sn_devstudio_/v1/get_publish_info", {
        onRefresh: this.onRefresh,
      });
      if (!response.ok) {
        throw new Error(`Authentication request failed (${response.status})`);
      }

      const data = (await response.json()) as { ck?: string };
      const cookies = response.headers.get("set-cookie");

      //extract cookies from response
      let jsessionid = "";
      let glide_user_route = "";
      let glide_session_store = "";
      let BIGipServerpool = "";
      const cookiesArray = ("" + cookies).split(";");
      for (let i = 0; i < cookiesArray.length; i++) {
        if (cookiesArray[i].indexOf("JSESSIONID") > -1) {
          jsessionid = cookiesArray[i].substring(cookiesArray[i].indexOf("JSESSIONID"), cookiesArray[i].length);
        }
        if (cookiesArray[i].indexOf("glide_user_route") > -1) {
          glide_user_route = cookiesArray[i].substring(
            cookiesArray[i].indexOf("glide_user_route"),
            cookiesArray[i].length,
          );
        }
        if (cookiesArray[i].indexOf("glide_session_store") > -1) {
          glide_session_store = cookiesArray[i].substring(
            cookiesArray[i].indexOf("glide_session_store"),
            cookiesArray[i].length,
          );
        }
        if (cookiesArray[i].indexOf("BIGipServerpool") > -1) {
          BIGipServerpool = cookiesArray[i].substring(
            cookiesArray[i].indexOf("BIGipServerpool"),
            cookiesArray[i].length,
          );
        }
      }

      if (!data.ck) throw new Error("Missing session token (ck) in authentication response");

      return {
        ck: data.ck,
        cookies: jsessionid + ";" + glide_user_route + ";" + glide_session_store + ";" + BIGipServerpool,
      };
    } catch (error) {
      console.error("Could not authenticate:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Could Not Authenticate",
        message: "This command requires admin access. Verify your credentials and permissions.",
      });
      return null;
    }
  }

  async startBackgroundScript(script: string, callback: (data: string) => void) {
    if (!this.sessionData) throw new Error("Not authenticated");
    const body = { script: script, runscript: "Run script" };

    try {
      const response = await serviceNowFetchRaw(this.instance, "/sys.scripts.do", {
        method: "POST",
        noAuth: true,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: this.sessionData.cookies,
          "X-UserToken": this.sessionData.ck,
        },
        body: new URLSearchParams(body).toString(),
      });

      const data = await response.text();
      callback(data);
    } catch (error) {
      console.error("Could not run background script:", error);
      showToast({ style: Toast.Style.Failure, title: "Could Not Run Background Script" });
    }
  }
}
