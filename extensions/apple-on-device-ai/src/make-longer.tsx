import { prompt } from "./prompts/make-longer";
import RunAIView from "./views/RunAIView";

export default function Command() {
  return <RunAIView prompt={prompt} />;
}
