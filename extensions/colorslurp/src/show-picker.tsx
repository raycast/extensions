import { openColorSlurpUrl } from "./utilities";

interface ShowPickerArguments {
  color?: string;
}

export default async function Command(props: { arguments: ShowPickerArguments }) {
  const { color } = props.arguments;

  if (color) {
    await openColorSlurpUrl(`colorslurp://x-callback-url/show-picker?color=${encodeURIComponent(color)}`);
  } else {
    await openColorSlurpUrl("colorslurp://x-callback-url/show-picker");
  }
}
