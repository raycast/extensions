import { LaunchProps } from "@raycast/api";
import Answer from "./components/Answer";
interface AskArgs {
  arguments: {
    question: string;
  };
}

export default function Ask(props: LaunchProps<AskArgs>) {
  const { question } = props.arguments;

  return <Answer question={question} />;
}
