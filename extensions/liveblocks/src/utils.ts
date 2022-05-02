import axios, { AxiosError } from "axios";

export async function getTokenFromSecret(secret: string): Promise<any> {
  try {
    const { data } = await axios.get("https://liveblocks.io/api/authorize", {
      headers: { Authorization: `Bearer ${secret}` },
    });

    return data.token;
  } catch (e) {
    const error = e as AxiosError;
    const status = error.response?.status;

    return status;
  }
}
