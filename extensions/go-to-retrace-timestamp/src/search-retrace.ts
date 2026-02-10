import { open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export default async function Command(props: { arguments: { query: string } }) {
  const query = props.arguments.query?.trim();

  if (!query) {
    await showFailureToast("No search query provided");
    return;
  }

  try {
    const deeplink = `retrace://search?q=${encodeURIComponent(query)}`;
    await open(deeplink);
  } catch (error: unknown) {
    await showFailureToast(error, { title: "Error opening Retrace search" });
  }
}
