import { AnswerView } from "./api/ui/AnswerView";

export default function Command(): JSX.Element {
  return <AnswerView command="image-describe" image={true} />;
}
