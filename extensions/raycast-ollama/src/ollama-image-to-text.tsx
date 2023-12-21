import { AnswerView } from "./api/ui/AnswerView";

export default function Command(): JSX.Element {
  return <AnswerView command="image-to-text" image={true} />;
}
