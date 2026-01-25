import { prompt } from "./prompts/make-shorter";
import RunAIView from "./views/RunAIView";

export default function Command() {
  return <RunAIView prompt={prompt} />;
}
