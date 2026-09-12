import axios from "axios";
import { Instance } from "./queryInstances";

export interface Authentication {
  user: {
    avatarUrl: string;
  };
}

const queryAuthentication = async (instance: Instance): Promise<Authentication | undefined> =>
  await axios
    .post(
      `${instance.url}/api/auth.info`,
      {},
      { headers: { Authorization: `Bearer ${instance.apiKey}`, "Content-Type": "application/json" } },
    )
    .then((response) => {
      return response.data.data as Authentication;
    })
    .catch(async (error) => {
      console.error("Failed to fetch authentication from ", instance.url, error);

      return undefined;
    });

export default queryAuthentication;
