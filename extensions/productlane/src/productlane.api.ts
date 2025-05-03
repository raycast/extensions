import axios from "axios";
import { getPreferenceValues } from "@raycast/api";
import { authorize } from "./oauth";

export async function getToken() {
  const token = await authorize();
  const preferences = getPreferenceValues<{ apiKey: string }>();

  const { apiKey } = preferences;

  // With the new api, we can use the api key directly. (https://docs.productlane.com)
  if (apiKey.startsWith("pl_"))
    return {
      token: apiKey,
      isDeprecated: false,
    };

  const params = {
    params: {
      key: apiKey,
      linearToken: token,
    },
  };

  const tokenData = await axios.post(`https://productlane.io/api/rpc/createAccessToken`, params, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  const bearerToken = tokenData.data.result;

  return {
    token: bearerToken as string,
    isDeprecated: true,
  };
}

type PainLevel = "UNKNOWN" | "LOW" | "MEDIUM" | "HIGH";
type InsightState = "NEW" | "PROCESSED" | "COMPLETED";
export interface CreateInsightInput {
  text: string;
  painLevel: PainLevel;
  state: InsightState;
  email: string;
}

export async function submitInsight({ text, painLevel, state, email }: CreateInsightInput) {
  const tokenDetails = await getToken();

  const urlCreate = tokenDetails.isDeprecated
    ? `https://productlane.com/api/rpc/createFeedback`
    : "https://productlane.com/api/v1/insights";

  const paramsCreate = {
    ...(tokenDetails.isDeprecated
      ? {
          params: {
            text: text,
            painLevel: painLevel,
            state: state,
            email: email,
          },
        }
      : {
          text: text,
          painLevel: painLevel,
          state: state,
          contactEmail: email,
          origin: "API_KEY_USER", // Will mark the insight as created by the user who created the API key initially.
          notify: {
            email: false,
          },
        }),
  };

  const insight = await axios.post(urlCreate, paramsCreate, {
    headers: {
      Authorization: `Bearer ${tokenDetails.token}`,
      "Content-Type": "application/json",
    },
  });

  return tokenDetails.isDeprecated ? insight.data.result : insight.data;
}
