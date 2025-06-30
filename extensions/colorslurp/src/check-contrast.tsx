import { openColorSlurpUrl } from "./utilities";

interface CheckContrastArguments {
  foreground?: string;
  background?: string;
}

export default async function Command(props: { arguments: CheckContrastArguments }) {
  const params = props.arguments;
  let query = "";

  if (params.foreground) {
    query += `foreground=${encodeURIComponent(params.foreground)}&`;
  }

  if (params.background) {
    query += `background=${encodeURIComponent(params.background)}`;
  }

  await openColorSlurpUrl(`colorslurp://x-callback-url/show-contrast?${query}`);
}
