import { prompt } from "./prompts/change-tone-to-confident";
import RunAIView from "./views/RunAIView";

export default function Command() {
  return <RunAIView prompt={prompt} />;
}
