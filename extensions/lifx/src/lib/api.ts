import { getPreferenceValues, Cache } from "@raycast/api";
import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { Api, Lights } from "./interfaces";
const keyCache = new Cache();

export async function FetchLights(config: AxiosRequestConfig) {
  try {
    const result = await axios.get("https://api.lifx.com/v1/lights/all", config);
    const data: Lights.Light[] = result.data;
    if (data.length === 0) {
      throw new Error("No lights found");
    }
    if (data[0].connected === true) {
      return data;
    } else {
      const potentialErrorData: Api.Error = result.data;
      throw new Error(potentialErrorData.error || "Unknown error" + result.status);
    }
  } catch (err) {
    handleCommonError(err);
  }
}

export async function SetLightState(selector: string, params: Api.lightStateParam, config: AxiosRequestConfig) {
  try {
    const result = await axios.put(
      `https://api.lifx.com/v1/lights/${selector ? selector : "all"}/state`,
      params,
      config
    );
    const data: Api.lightStateResult = result.data;
    if (data.results[0].status === "ok") {
      const returnData: Api.lightStateResult = result.data;
      return returnData;
    } else {
      throw new Error("Light " + data.results[0].status || "Error");
    }
  } catch (err) {
    handleCommonError(err);
  }
}

export async function toggleLight(selector: string, params: Api.toggleLight, config: AxiosRequestConfig) {
  try {
    const result = await axios.post(
      `https://api.lifx.com/v1/lights/${selector ? selector : "all"}/toggle`,
      params,
      config
    );
    const data: Api.lightStateResult = result.data;
    if (data.results[0].status === "offline") {
      throw new Error("Light is offline");
    }
    if (result.status === 200 || result.status === 202 || result.status === 207) {
      const returnData: Api.lightStateResult = result.data;
      return returnData;
    } else {
      const potentialErrorData: Api.Error = result.data;
      throw new Error(potentialErrorData.error || "Unknown error" + result.status);
    }
  } catch (err) {
    handleCommonError(err);
  }
}

export async function FetchScenes(config: AxiosRequestConfig) {
  try {
    const result = await axios.get("https://api.lifx.com/v1/scenes", config);
    const data: Api.Scene[] = result.data;
    if (data.length === 0) {
      throw new Error("No scenes found");
    }
    if (result.status === 200 || result.status === 202 || result.status === 207) {
      const returnData: Api.Scene[] = result.data;
      return returnData;
    } else {
      const potentialErrorData: Api.Error = result.data;
      throw new Error(potentialErrorData.error || "Unknown error" + result.status);
    }
  } catch (err) {
    handleCommonError(err);
  }
}

export async function SetScenes(scene_uuid: string, params: Api.sceneParams, config: AxiosRequestConfig) {
  try {
    const result = await axios.put(`https://api.lifx.com/v1/scenes/scene_id:${scene_uuid}/activate`, params, config);
    const data: Api.lightStateResult = result.data;
    if (data.results[0].status === "ok") {
      const returnData: Api.lightStateResult = result.data;
      return returnData;
    } else {
      throw new Error("Light " + data.results[0].status || "Error");
    }
  } catch (err) {
    handleCommonError(err);
  }
}

export async function cleanLights(selector: string, params: Api.cleanParams, config: AxiosRequestConfig) {
  try {
    const result = await axios.post(
      `https://api.lifx.com/v1/lights/${selector ? selector : "all"}/clean`,
      params,
      config
    );
    const data: Api.lightStateResult = result.data;
    if (data.results[0].status === "ok") {
      const returnData: Api.lightStateResult = result.data;
      return returnData;
    } else {
      throw new Error("Light " + data.results[0].status || "Error");
    }
  } catch (err) {
    handleCommonError(err);
  }
}

export async function SetEffect(
  selector: string,
  effect: Api.effectType,
  params: Api.effectParams,
  config: AxiosRequestConfig
) {
  try {
    const result = await axios.post(
      `https://api.lifx.com/v1/lights/${selector ? selector : "all"}/effects/${effect}`,
      params,
      config
    );
    const data: Api.lightStateResult = result.data;
    if (data.results[0].status === "ok") {
      const returnData: Api.lightStateResult = result.data;
      return returnData;
    } else {
      throw new Error("Light " + data.results[0].status || "Error");
    }
  } catch (err) {
    handleCommonError(err);
  }
}

export async function checkApiKey() {
  const prefernces = getPreferenceValues();
  try {
    if (keyCache.has("token")) {
      const result = JSON.parse(keyCache.get("token") || "false");
      if (result.isValid === true) {
        return true;
      } else {
        return false;
      }
    } else {
      console.info("Token not cached");
    }
    const result = await axios.get("https://api.lifx.com/v1/color", {
      headers: {
        Authorization: `Bearer ${prefernces.lifx_token}`,
      },
    });
    if (result.status === 401) {
      throw new Error("Invalid API Key");
    } else {
      keyCache.set("token", JSON.stringify({ isValid: true }));
      return true;
    }
  } catch (err) {
    if (err instanceof AxiosError) {
      if (err.response?.status === 401) {
        return false;
      } else {
        keyCache.set("token", JSON.stringify({ isValid: true }));
        return true;
      }
    }
    return false;
  }
}

function handleCommonError(err: unknown) {
  if (err instanceof AxiosError) {
    console.info(err.response?.data.error);
    throw new Error(err.response?.data.error || "Unknown error");
  } else if (err instanceof Error) {
    throw new Error(err.message || "Unknown error");
  } else {
    throw new Error("Unexpected error");
  }
}
