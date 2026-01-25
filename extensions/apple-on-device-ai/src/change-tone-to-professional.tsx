import { prompt } from "./prompts/change-tone-to-professional";
import RunAIView from "./views/RunAIView";

export default function Command() {
  return <RunAIView prompt={prompt} />;
}
