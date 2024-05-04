import { AnswerView } from "./api/ui/AnswerView";

export default function Command(): JSX.Element {
  const c = "codeexplain";
  const p =
    "Act as a developer. Explain the following code block step by step.\n\nOutput only with the commented code.\n";
  return <AnswerView command={c} prompt={p} />;
}
