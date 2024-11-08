import useGPT from "./api/gpt.jsx";
import { getBrowserTab } from "./helpers/browser";

export default function AskAboutBrowserTab(props) {
  return useGPT(props, {
    allowPaste: true,
    requireQuery: true,
    showFormText: "Query",
    processPrompt: async ({ query }) => {
      const browserTab = await getBrowserTab();
      return `Browser tab content: ${browserTab}\n\n${query}`;
    },
  });
}
