import axios from "axios";
import { Instance } from "./queryInstances";

export interface Collection {
  icon: string;
  name: string;
}

const queryCollection = async (instance: Instance, collectionID: string): Promise<Collection | undefined> =>
  await axios
    .post(
      `${instance.url}/api/collections.info`,
      {
        id: collectionID,
      },
      {
        headers: { Authorization: `Bearer ${instance.apiKey}`, "Content-Type": "application/json" },
      },
    )
    .then((response) => {
      return response.data.data as Collection;
    })
    .catch(async (error) => {
      console.error("Failed to fetch collection from", instance.url, error);

      return undefined;
    });

export default queryCollection;
