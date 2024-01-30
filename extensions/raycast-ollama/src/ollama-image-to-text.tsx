import { AnswerView } from "./api/ui/AnswerView";

export default function Command(): JSX.Element {
  const c = "image-to-text";
  const p = "Extract all the text from the following images.\n";
  return <AnswerView command={c} prompt={p} image={true} />;
}
