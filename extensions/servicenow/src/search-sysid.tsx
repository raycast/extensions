import { LaunchProps, LocalStorage, showToast, Toast, open } from "@raycast/api";
import { Instance } from "./types";
import { findSysID } from "./utils/snSnippets";

export default async (props: LaunchProps) => {
  const { sys_id, instanceName } = props.arguments;
  const item = await LocalStorage.getItem<string>("saved-instances");

  if (!item) {
    showToast(Toast.Style.Failure, "No instances found", "Please create an instance profile first");
    return;
  }

  let instance;
  if (instanceName) {
    const instanceProfiles = JSON.parse(item) as Instance[];
    instance = instanceProfiles.find(
      (i: Instance) =>
        i.name.toLowerCase().includes(instanceName.toLowerCase()) ||
        i.alias?.toLowerCase().includes(instanceName.toLowerCase()),
    );
  } else {
    const selectedInstance = await LocalStorage.getItem<string>("selected-instance");
    if (selectedInstance) instance = JSON.parse(selectedInstance) as Instance;
  }

  if (!instance) {
    showToast(
      Toast.Style.Failure,
      "Instance not found",
      `No instance found with name or alias containing ${instanceName}`,
    );
    return;
  }

  showToast(Toast.Style.Animated, `Searching sys_id in ${instance.alias}...`);

  const client = new ServiceNowClient(instance);
  const isAuthenticated = await client.init();

  if (!isAuthenticated) {
    return;
  }

  const callBack = (response: string) => {
    const answer = response.match(/###(.*)###/);
    if (response.length === 0) showToast(Toast.Style.Failure, "Could not search for sys_id. (are you an Admin?)");
    else if (answer != null && answer[1]) {
      const table = answer[1].split("^")[0];
      const path = table + ".do?sys_id=" + sys_id;
      open(`https://${instance.name}.service-now.com/${path}`);
    } else {
      showToast(Toast.Style.Failure, `sys_id not found on ${instance.alias}`);
    }
  };

  await client.startBackgroundScript(findSysID(sys_id), callBack);
};

class ServiceNowClient {
  private instance: Instance;
  private sessionData: { ck: string; cookies: string } | null = null;

  constructor(instance: Instance) {
    this.instance = instance;
  }

  async init(): Promise<boolean> {
    this.sessionData = await this.authenticate();
    return this.sessionData !== null;
  }

  async authenticate() {
    const url = `https://${this.instance.name}.service-now.com/sn_devstudio_/v1/get_publish_info`;

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Basic ${Buffer.from(this.instance.username + ":" + this.instance.password).toString("base64")}`,
        },
      });

      const data = await response.json();
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

      return {
        ck: data.ck,
        cookies: jsessionid + ";" + glide_user_route + ";" + glide_session_store + ";" + BIGipServerpool,
      };
    } catch (error) {
      console.error("Authentication Failed:", error);
      showToast(
        Toast.Style.Failure,
        "Authentication Failed",
        "This command requires admin access in ServiceNow. Please verify your credentials and permissions.",
      );
      return null;
    }
  }

  async startBackgroundScript(script: string, callback: (data: string) => void) {
    if (!this.sessionData) throw new Error("Not authenticated");
    const url = `https://${this.instance.name}.service-now.com/sys.scripts.do`;

    const body = { script: script, runscript: "Run script" };

    try {
      const response = await fetch(url, {
        method: "POST",
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
      console.error("Background Script failed:", error);
      showToast(Toast.Style.Failure, "Background Script failed");
    }
  }
}
