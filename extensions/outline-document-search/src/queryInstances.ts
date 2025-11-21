import { showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
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
  instances.map(async (instance) => {
    try {
      const response = await fetch(`${instance.url}/api/documents.search`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${instance.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as { data: Match[] };
      return data.data.map((match: Match) => ({
        ...match.document,
        url: `${instance.url}/doc/${match.document.id}`,
      })) as Document[];
    } catch (error) {
      await showToast(Toast.Style.Failure, `Failed to fetch documents from ${instance.url}!`);
      console.error("Failed to fetch documents from", instance.url, error);
      return [];
    }
  });

export default queryInstances;
