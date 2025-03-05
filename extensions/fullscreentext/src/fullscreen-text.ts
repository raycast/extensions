import { fullScreen } from "swift:../swift/fullscreen";

export default async function Command(props: { arguments: { text: string } }) {
  const text = props.arguments.text;

  await fullScreen(text);
}
