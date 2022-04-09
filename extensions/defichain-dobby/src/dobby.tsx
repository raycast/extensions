import { Detail } from "@raycast/api";
import { transformVaultsToMarkdown } from "./models/vault";
import { getVaults } from "./api";
import { useEffect, useState } from "react";

export type LoadingStatus = "loading" | "success" | "failure";

export default function Command() {
  const [status, setStatus] = useState<LoadingStatus>("loading");
  const [markdownString, setMarkdownString] = useState<string>("### loading your vaults...");
  useEffect(() => {
    async function fetchVaults() {
      try {
        setMarkdownString(await getVaults().then((r) => transformVaultsToMarkdown(r)));
        setStatus("success");
      } catch (error) {
        setStatus("failure");
      }
    }
    fetchVaults();
  }, [markdownString]);

  return <Detail isLoading={status === "loading"} markdown={markdownString} />;
}
