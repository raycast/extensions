import type { LaunchProps } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { openRetraceDeeplink } from "./open-retrace-deeplink";

type Props = LaunchProps<{ arguments: Arguments.SearchRetrace }>;

export default async function Command(props: Props) {
  const query = props.arguments.query?.trim();

  if (!query) {
    await showFailureToast("No search query provided");
    return;
  }

  try {
    await openRetraceDeeplink({
      context: "search-retrace",
      urls: [`retrace://search?q=${encodeURIComponent(query)}`],
      metadata: {
        query,
      },
    });
  } catch (error: unknown) {
    await showFailureToast(error, { title: "Error opening Retrace search" });
  }
}
