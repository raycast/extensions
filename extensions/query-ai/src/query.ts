import { LaunchProps, open, getPreferenceValues } from "@raycast/api";

const urlBuilders = {
  chatgpt: (q: string) => `https://chatgpt.com/?hints=search&q=${encodeURIComponent(q)}`,
  claude: (q: string) => `https://claude.ai/new?q=${encodeURIComponent(q)}`,
  grok: (q: string) => `https://grok.com/?q=${encodeURIComponent(q)}`,
  perplexity: (q: string) => `https://www.perplexity.ai/?q=${encodeURIComponent(q)}`,
  bing: (q: string) => `https://www.bing.com/search?showconv=1&sendquery=1&q=${encodeURIComponent(q)}`,
} as const;

type ServiceKey = keyof typeof urlBuilders;

export default async function Command(props: LaunchProps<{ arguments: Arguments.Query }>) {
  try {
    const { prompt } = props.arguments;

    // If you define preferences for a command, you can get its strong type via Preferences.Query
    const { defaultService } = getPreferenceValues<Preferences.Query>();

    const argService = props.arguments.service as ServiceKey | undefined;
    const service: ServiceKey = argService && argService in urlBuilders ? argService : (defaultService as ServiceKey);

    const build = urlBuilders[service];
    const url = build(prompt);

    await open(url); // open in default browser, or specify an app bundle id
  } catch (error) {
    console.error("Failed to open URL:", error);
  }
}
