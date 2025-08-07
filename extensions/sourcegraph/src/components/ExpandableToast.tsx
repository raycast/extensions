import { Toast, Detail, useNavigation } from "@raycast/api";
import { bold } from "../markdown";

/**
 * ExpandableToast creates a Raycast toast with the given navigationTitle and title,
 * and offers a primary action that renders a Detail view with the full description as
 * markdown.
 *
 * The style default to Failure, but can be set before .show().
 */
export default function ExpandableToast(
  push: ReturnType<typeof useNavigation>["push"],
  navigationTitle: string,
  title: string,
  description: string,
) {
  return new Toast({
    style: Toast.Style.Failure, // default
    title: title,
    primaryAction: {
      title: "View details",
      onAction: () => {
        push(<Detail markdown={`${bold(title)}\n\n${description}`} navigationTitle={navigationTitle} />);
      },
    },
  });
}
