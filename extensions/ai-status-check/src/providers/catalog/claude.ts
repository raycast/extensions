import { createStatuspageAdapter } from "../adapters/statuspage";
import { createProvider } from "../factories/provider";

export const claudeProvider = createProvider(
  {
    id: "claude",
    name: "Claude",
    aliases: ["Anthropic", "Claude API", "Claude Code", "Claude Cowork"],
    category: "model-providers",
    preferenceKey: "showClaude",
    icon: "provider-icons/claude.png",
    statusPageUrl: "https://status.claude.com/",
  },
  createStatuspageAdapter,
);
