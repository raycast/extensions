import { AnswerView } from "./api/ui/AnswerView";

export default function Command(): JSX.Element {
  const c = "improve";
  const p =
    "Act as a writer. Improve the writing of the following text while keeping the core idea.\n\nOutput only with the modified text.\n";
  return <AnswerView command={c} prompt={p} />;
}
