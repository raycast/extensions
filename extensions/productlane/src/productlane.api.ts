import axios from "axios";
import { getPreferenceValues } from "@raycast/api";
import { authorize } from "./oauth";

export async function getToken() {
  const token = await authorize();
  const preferences = getPreferenceValues<{ apiKey: string }>();

  const laneKey = preferences.apiKey;

  const params = {
    params: {
      key: laneKey,
      linearToken: token,
    },
  };

  const tokenData = await axios.post(`https://productlane.io/api/rpc/createAccessToken`, params, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  const bearerToken = tokenData.data.result;

  return bearerToken;
}

export async function submitInsight({
  text,
  painLevel,
  state,
  email,
}: {
  text: string;
  painLevel: string;
  state: string;
  email: string;
}) {
  const bearerToken = await getToken();
  const urlCreate = `https://productlane.io/api/rpc/createFeedback`;

  const paramsCreate = {
    params: {
      text: text,
      painLevel: painLevel,
      state: state,
      email: email,
    },
  };

  const insight = await axios.post(urlCreate, paramsCreate, {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      "Content-Type": "application/json",
    },
  });

  return insight.data;
}
