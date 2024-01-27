import { AnswerView } from "./api/ui/AnswerView";

export default function Command(): JSX.Element {
  const c = "image-describe";
  const p = "Describe the content on the following images.\n";
  return <AnswerView command={c} prompt={p} image={true} />;
}
