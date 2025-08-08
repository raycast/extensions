import { showFailureToast, useFetch } from "@raycast/utils";
import type { ParsedInput } from "@/utils";

const useWhoisData = (input: ParsedInput & { ip?: string | null }, execute = true) => {
  return useFetch(`https://ipwho.is/${input.ip}`, {
    execute: execute && typeof input.ip !== "undefined" && input.ip !== null,
    keepPreviousData: true,
    onError(error) {
      showFailureToast(error, {
        title: "Error fetching WHOIS data",
        message: "Please make sure you have a valid IP address.",
      });
    },
    parseResponse: async (response) => {
      if (!response.ok) {
        throw new Error("Invalid response");
      }
      let markdown = `# [WHOIS](https://who.is/whois/${input.input}) 🌐\n\n`;
      const data = (await response.json()) as Record<string, unknown>;
      for (const [key, value] of Object.entries(data)) {
        const header = key.charAt(0).toUpperCase() + key.slice(1);
        markdown += `# \`${header}\`\n`;

        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
          for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
            markdown += `* **${k}**: ${v}\n\n`;
          }
        } else {
          markdown += `* ${value}\n\n`; // Print the value directly if it's not an object
        }
      }

      return markdown;
    },
  });
};

export default useWhoisData;
