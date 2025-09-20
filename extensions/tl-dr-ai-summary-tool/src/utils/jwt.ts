import jwt from "jsonwebtoken";
import { getPreferenceValues } from "@raycast/api";

const exp_seconds = 3600;

function getAPI() {
  const pref = getPreferenceValues<Preferences>();
  const key = pref.zhipuApiKey ?? "";
  const API_KEY = /\w+\.\w+/.test(key) ? key.split(".")[0] : "";
  const API_SECRET = /\w+\.\w+/.test(key) ? key.split(".")[1] : "";
  return { API_KEY, API_SECRET };
}
export function generateToken() {
  const { API_KEY, API_SECRET } = getAPI();
  const payload = {
    api_key: API_KEY,
    exp: Math.floor(Date.now() / 1000) + exp_seconds * 1000,
    timestamp: Math.floor(Date.now() / 1000),
  };

  // @ts-expect-error: ignore sign_type
  const token = jwt.sign(payload, API_SECRET, { algorithm: "HS256", header: { sign_type: "SIGN" } });

  return token;
}

export function isKeyReady() {
  const { API_KEY, API_SECRET } = getAPI();
  return API_KEY !== "" && API_SECRET !== "";
}
