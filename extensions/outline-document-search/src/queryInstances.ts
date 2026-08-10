import axios from "axios";
import { showToast, Toast } from "@raycast/api";
import Document from "./OutlineDocument";

export interface Instance {
  name: string;
  url: string;
  apiKey: string;
}

interface Match {
  context: string;
  document: Document;
}

const queryInstances = (query: string, instances: Instance[]) =>
  instances.map((instance) =>
    axios
      .post(
        `${instance.url}/api/documents.search`,
        { query },
        {
          headers: { Authorization: `Bearer ${instance.apiKey}`, "Content-Type": "application/json" },
        },
      )
      .then(
        (response) =>
          response.data.data.map((match: Match) => ({
            ...match.document,
            url: `${instance.url}/doc/${match.document.id}`,
          })) as Document[],
      )
      .catch(async (error) => {
        await showToast(Toast.Style.Failure, `Failed to fetch documents from ${instance.url}!`);

        console.error("Failed to fetch documents from", instance.url, error);

        return [];
      }),
  );

export default queryInstances;
