import axios from "axios";
import { config } from "./config";

async function get(url: string, jwt: string): Promise<unknown> {
  if (!jwt) {
    throw new Error("No JWT provided");
  }

  try {
    const response = await axios.get(`${config.apiURL}${url}`, {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(
        `GET request failed: ${error.response.status} - ${error.response.data?.message || error.response.statusText}`,
      );
    }
    throw error;
  }
}

async function post(url: string, body: unknown, jwt: string): Promise<unknown> {
  if (!jwt) throw new Error("No JWT provided");

  try {
    const response = await axios.post(`${config.apiURL}${url}`, body, {
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(
        `POST request failed: ${error.response.status} - ${error.response.data?.message || error.response.statusText}`,
      );
    }
    throw error;
  }
}

export { get, post };
