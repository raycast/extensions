import { List, AI, getPreferenceValues } from "@raycast/api";
import ListItem from "./components/ListItem";

type Props = {
  arguments: {
    prompt: string;
  };
};

export default function Command(props: Props) {
  const { prompt } = props.arguments;
  const preferences = getPreferenceValues<Preferences>();

  const models = [
    {
      enabled: preferences.enableAnthropic,
      model: AI.Model[preferences.anthropicModel],
      provider: "Anthropic",
      apiKey: preferences.anthropicApiKey,
    },
    {
      enabled: preferences.enableOpenAI,
      model: AI.Model[preferences.openaiModel],
      provider: "OpenAI",
      apiKey: preferences.openaiApiKey,
    },
    {
      enabled: preferences.enableGoogle,
      model: AI.Model[preferences.googleModel],
      provider: "Google",
      apiKey: preferences.googleApiKey,
    },
    {
      enabled: preferences.enableDeepSeek,
      model: AI.Model[preferences.deepseekModel],
      provider: "DeepSeek",
      apiKey: undefined,
    },
    {
      enabled: preferences.enableXAI,
      model: AI.Model[preferences.xaiModel],
      provider: "xAI",
      apiKey: preferences.xaiApiKey,
    },
    {
      enabled: preferences.enablePerplexity,
      model: AI.Model[preferences.perplexityModel],
      provider: "Perplexity",
      apiKey: undefined,
    },
    {
      enabled: preferences.enableLlama,
      model: AI.Model[preferences.llamaModel],
      provider: "Llama",
      apiKey: undefined,
    },
    {
      enabled: preferences.enableMistral,
      model: AI.Model[preferences.mistralModel],
      provider: "Mistral",
      apiKey: preferences.mistralApiKey,
    },
  ].filter((model) => model.enabled);

  return (
    <List isShowingDetail>
      {models.map((model) => (
        <ListItem
          key={model.provider}
          prompt={prompt}
          provider={model.provider}
          model={model.model}
          apiKey={model.apiKey}
        />
      ))}
    </List>
  );
}
