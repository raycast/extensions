import { startFocusFlow } from "./actions";

export default async function Command(props: { arguments: Arguments.StartFocus }) {
  await startFocusFlow(props.arguments.minutes);
}
