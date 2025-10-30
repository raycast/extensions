import { AI } from "@raycast/api";
import ListItemRaycast from "./ListItemRaycast";
import ListItemVercel from "./ListItemVercel";

type Props = {
  prompt: string;
  provider: string;
  model: AI.Model;
  apiKey?: string;
};

export default function ListItem({ prompt, provider, model, apiKey }: Props) {
  if (apiKey) {
    return <ListItemVercel prompt={prompt} provider={provider} model={model} apiKey={apiKey} />;
  }
  return <ListItemRaycast prompt={prompt} provider={provider} model={model} />;
}
