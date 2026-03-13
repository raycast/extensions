import { Toast, showToast } from "@raycast/api";
import fetch, { FetchError } from "node-fetch";
import { DOMParser } from "@xmldom/xmldom";
import {
  BootVirtualServerResponse,
  ErrorResponse,
  GetVirtualServerInformationResponse,
  GetVirtualServerStatusResponse,
  RebootVirtualServerResponse,
  ShutdownVirtualServerResponse,
  SuccessResponse,
} from "./types";
import { API_HASH, API_KEY, SOLUSVM_URL } from "./constants";

const callApi = async (action: string, animatedToastMessage = "") => {
  await showToast(Toast.Style.Animated, "Processing...", animatedToastMessage);

  try {
    const API_URL = new URL(`api/client/command.php?key=${API_KEY}&hash=${API_HASH}&action=`, SOLUSVM_URL);

    const apiResponse = await fetch(API_URL + action + "&status=true");
    if (!apiResponse.ok) {
      const message = "Something went wrong";
      await showToast({ title: `${apiResponse.status} Error`, message, style: Toast.Style.Failure });
      return { status: "error", statusmsg: message };
    } else {
      const response = await apiResponse.text();
      const parsed = parseApiResponse(response) as ErrorResponse | SuccessResponse;
      if (parsed.status === "error") {
        await showToast({ title: "ERROR", message: parsed.statusmsg, style: Toast.Style.Failure });
      }
      return parsed;
    }
  } catch (error) {
    let message = "Something went wrong";
    if (error instanceof FetchError) {
      message = error.message;
    } else if (error instanceof TypeError) {
      message = "Invalid URL - make sure the SolusVM URL is valid";
    }
    await showToast({ title: "ERROR", message, style: Toast.Style.Failure });
    return { status: "error", statusmsg: message };
  }
};

function parseApiResponse(responseString: string) {
  // Add a root element to the response string
  const xmlStringWithRoot = `<root>${responseString}</root>`;

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlStringWithRoot, "text/xml");

  const result: { [key: string]: string } = {};
  const nodes = xmlDoc.getElementsByTagName("*");
  for (let i = 0; i < nodes.length; i++) {
    const key = nodes[i].nodeName;
    const value = nodes[i].textContent || "";
    result[key] = value;
  }
  // we remove root as it was only needed to parse XML
  delete result.root;
  return result;
}

export async function getVirtualServerStatus() {
  return (await callApi("status", "Fetching Status")) as ErrorResponse | GetVirtualServerStatusResponse;
}
export async function getVirtualServerInformation() {
  const params = new URLSearchParams({ ipaddr: "true", hdd: "true", mem: "true", bw: "true" });
  return (await callApi(`info&${params}`, "Fetching Information")) as
    | ErrorResponse
    | GetVirtualServerInformationResponse;
}
export async function rebootVirtualServer() {
  return (await callApi("reboot", "Rebooting")) as ErrorResponse | RebootVirtualServerResponse;
}
export async function bootVirtualServer() {
  return (await callApi("boot", "Booting")) as ErrorResponse | BootVirtualServerResponse;
}
export async function shutdownVirtualServer() {
  return (await callApi("shutdown", "Shutting Down")) as ErrorResponse | ShutdownVirtualServerResponse;
}
