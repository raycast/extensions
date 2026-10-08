import { showFailureToast, useFetch } from "@raycast/utils";
import type { ParsedInput } from "@/utils";

const useWhoisData = (input: (ParsedInput & { ip?: string | null }) | undefined, execute = true) => {
  return useFetch(`http://ip-api.com/json/${input?.ip ?? ""}`, {
    execute: execute && typeof input?.ip !== "undefined" && input?.ip !== null,
    keepPreviousData: true,
    onError(error) {
      showFailureToast(error, {
        title: "Error fetching IP data",
        message: "Please make sure you have a valid IP address.",
      });
    },
    parseResponse: async (response) => {
      let data: Record<string, unknown> = {};
      try {
        data = (await response.json()) as Record<string, unknown>;
      } catch {
        if (!response.ok) throw new Error(`Invalid response: HTTP ${response.status}`);
      }

      if (!response.ok || data.status === "fail") {
        return `# [WHOIS](https://who.is/whois/${input?.input ?? ""}) 🌐\n\n> **Error:** ${data.message || `HTTP ${response.status}`}`;
      }
      let markdown = `# 🌐 ${input?.input ?? ""}\n\n`;
      markdown += "| Property | Value |\n| :--- | :--- |\n";
      for (const [key, value] of Object.entries(data)) {
        if (key === "query" || key === "status") continue;
        const header =
          key.charAt(0).toUpperCase() +
          key
            .slice(1)
            .replace(/([A-Z])/g, " $1")
            .trim();

        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
          markdown += `| **${header}** | \`${JSON.stringify(value)}\` |\n`;
        } else {
          markdown += `| **${header}** | ${value} |\n`;
        }
      }

      return markdown;
    },
  });
};

export default useWhoisData;
