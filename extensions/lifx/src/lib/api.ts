import { getPreferenceValues } from "@raycast/api";
import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { Api } from "./interfaces";

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

export async function SetEffect(selector: string, effect: Api.effectType, params: Api.effectParams, config: AxiosRequestConfig) {
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
  if (prefernces.lifx_token.length > 6) {
    return true;
  } else {
    return false;
  }
}

function handleCommonError(err: any) {
  if (err instanceof AxiosError) {
    console.info(err.response?.data.error);
    throw new Error(err.response?.data.error || "Unknown error");
  } else if (err instanceof Error) {
    throw new Error(err.message || "Unknown error");
  } else {
    throw new Error("Unexpected error");
  }
}
