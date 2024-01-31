import { AnswerView } from "./api/ui/AnswerView";

export default function Command(): JSX.Element {
  const c = "fix";
  const p =
    "Act as a writer. Fix the following text from spelling and grammar error.\n\nOutput only with the fixed text.\n";
  return <AnswerView command={c} prompt={p} />;
}
