import { Detail, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect } from "react";

const { port } = getPreferenceValues<Preferences.LatticeStatus>();
const BASE = `http://127.0.0.1:${port || "52731"}/api/v1`;

interface Status {
  ok: boolean;
  apiVersion: string;
  appVersion: string;
  capabilities: string[];
}

export default function Command() {
  const { data, isLoading, error } = useFetch<Status>(`${BASE}/status`);

  useEffect(() => {
    if (error) {
      showToast({ style: Toast.Style.Failure, title: "Lattice not reachable", message: error.message });
    }
  }, [error]);

  const md = isLoading
    ? "Checking connection…"
    : error
      ? `## Connection Failed\n\nCould not reach Lattice at \`${BASE}\`.\n\nMake sure the Lattice app is running.`
      : [
          "## Lattice is Running",
          `**API Version:** ${data?.apiVersion}`,
          `**App Version:** ${data?.appVersion}`,
          `**Capabilities:** ${data?.capabilities?.join(", ") || "—"}`,
        ].join("\n\n");

  return <Detail isLoading={isLoading} markdown={md} />;
}
