import { fullScreen } from "./utils";

export default async function Command(props: { arguments: { text: string } }) {
  const text = props.arguments.text;

  await fullScreen(text);
}
