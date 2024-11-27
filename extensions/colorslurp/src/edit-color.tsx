import { openColorSlurpUrl } from "./utilities";

interface EditColorArguments {
  color: string;
}

export default async function Command(props: { arguments: EditColorArguments }) {
  const { color } = props.arguments;

  await openColorSlurpUrl(`colorslurp://x-callback-url/show-picker?color=${encodeURIComponent(color)}`);
}
