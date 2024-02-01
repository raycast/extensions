import { AnswerView } from "./api/ui/AnswerView";

export default function Command(): JSX.Element {
  const c = "longher";
  const p =
    "Act as a writer. Make the following text longer and more rich while keeping the core idea.\n\nOutput only with the modified text.\n";
  return <AnswerView command={c} prompt={p} />;
}
