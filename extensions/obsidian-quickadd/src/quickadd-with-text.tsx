import { LaunchProps } from "@raycast/api";
import { ChoiceList } from "./components";

export default function Command(props: LaunchProps<{ arguments: Arguments.QuickaddWithText; fallbackText?: string }>) {
  const text = props.arguments?.text || props.fallbackText || "";
  return <ChoiceList initialText={text} directSend />;
}
