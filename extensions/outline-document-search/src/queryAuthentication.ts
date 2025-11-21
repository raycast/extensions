import { Instance } from "./queryInstances";
import fetch from "node-fetch";

export interface Authentication {
  user: {
    avatarUrl: string;
  };
}

const queryAuthentication = async (instance: Instance): Promise<Authentication | undefined> => {
  try {
    const response = await fetch(`${instance.url}/api/auth.info`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${instance.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as { data: Authentication };
    return data.data;
  } catch (error) {
    console.error("Failed to fetch authentication from ", instance.url, error);
    return undefined;
  }
};

export default queryAuthentication;
