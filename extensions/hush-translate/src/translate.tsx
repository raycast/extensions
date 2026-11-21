import { LaunchProps } from "@raycast/api";
import { Translator } from "./translator";

type Context = { text?: string; image?: string };

export default function Command(props: LaunchProps<{ launchContext: Context }>) {
  const { text, image } = props.launchContext ?? {};
  if (image) return <Translator source="screenshot" image={image} />;
  return <Translator source="input" text={text ?? props.fallbackText} />;
}
