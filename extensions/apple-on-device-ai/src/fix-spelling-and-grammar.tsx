import { prompt } from "./prompts/fix-spelling-and-grammar";
import RunAIView from "./views/RunAIView";

export default function Command() {
  return <RunAIView prompt={prompt} />;
}
