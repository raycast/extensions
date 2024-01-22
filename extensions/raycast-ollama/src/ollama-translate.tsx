import { AnswerView } from "./api/ui/AnswerView";
import { RaycastArgumentsOllamaCommandTranslate } from "./api/types";

export default function Command(props: RaycastArgumentsOllamaCommandTranslate): JSX.Element {
  const c = "translate";
  const p = `Act as a translator. Translate the following text to ${props.arguments.language}.\n\nOutput only with the translated text.\n`;
  return <AnswerView command={c} prompt={p} />;
}
