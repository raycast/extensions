import { AnswerView } from "./api/ui/AnswerView";

export default function Command(): JSX.Element {
  const c = "explain";
  const p =
    "Act as a writer. Explain the following text in simple and concise terms.\n\nOutput only with the modified text.\n";
  return <AnswerView command={c} prompt={p} />;
}
