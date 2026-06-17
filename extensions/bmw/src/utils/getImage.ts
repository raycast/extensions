import { getPreferenceValues } from "@raycast/api";
import axios from "axios";
import { Account, Regions } from "bmw-connected-drive";
import { v4 as uuidv4 } from "uuid";
import { ViewDirection } from "../types/ViewDirection";

export async function getImage(vin: string, direction: ViewDirection, account: Account): Promise<string> {
  const { region } = getPreferenceValues<{
    username: string;
    VIN?: string;
    password: string;
    region: Regions;
  }>();

  const endpoints = {
    NorthAmerica: "cocoapi.bmwgroup.us",
    RestOfWorld: "cocoapi.bmwgroup.com",
    China: "myprofile.bmw.com.cn",
  };

  const X_User_Agent = {
    NorthAmerica: "android(SP1A.210812.016.C1);bmw;2.5.2(14945);na",
    RestOfWorld: "android(SP1A.210812.016.C1);bmw;2.5.2(14945);row",
    China: "android(SP1A.210812.016.C1);bmw;2.3.0(13603);cn",
  };

  const url = `https://${endpoints[region]}/eadrax-ics/v3/presentation/vehicles/${vin}/images?carView=${direction}`;
  const correlationId = uuidv4();

  const headers = {
    Accept: "application/json",
    "accept-language": "en",
    "Content-Type": "application/json;charset=UTF-8",
    Authorization: `Bearer ${(await account.getToken()).accessToken}`,
    "user-agent": "Dart/2.14 (dart:io)",
    "x-user-agent": X_User_Agent[region],
    "x-identity-provider": "gcdm",
    "bmw-session-id": correlationId,
    "x-correlation-id": correlationId,
    "bmw-correlation-id": correlationId,
  };

  try {
    const response = await axios.get(url, { headers: headers, responseType: "arraybuffer" });
    const data = Buffer.from(response.data, "binary").toString("base64");
    const image = `data:${response.headers["content-type"]};base64,${data}`;
    return image;
  } catch (error) {
    throw new Error(error as string);
  }
}
