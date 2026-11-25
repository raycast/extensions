import {
  Clipboard,
  LaunchProps,
  showHUD,
  showToast,
  Toast,
  getPreferenceValues,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { searchIcons, getIcon } from "./api";

export default async function CopyIcon(
  props: LaunchProps<{ arguments: Arguments.CopyIcon }>,
) {
  const { query } = props.arguments;
  const { defaultVariant } = getPreferenceValues<Preferences>();

  try {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Searching...",
    });

    // Search for the icon
    const results = await searchIcons(query, undefined, 1);
    if (results.icons.length === 0) {
      toast.style = Toast.Style.Failure;
      toast.title = `No icon found for "${query}"`;
      return;
    }

    const match = results.icons[0];
    toast.title = `Fetching ${match.title} SVG...`;

    // Get full icon data with inline SVG
    const detail = await getIcon(match.slug);
    const variant = detail.variants[defaultVariant];

    if (!variant?.svg) {
      toast.style = Toast.Style.Failure;
      toast.title = `${defaultVariant} variant is unavailable`;
      toast.message = "Use Search Brand Icons to choose an available variant.";
      return;
    }

    await Clipboard.copy(variant.svg);
    toast.style = Toast.Style.Success;
    toast.title = `Copied ${match.title} SVG`;
    await showHUD(`Copied ${match.title} SVG`);
  } catch (error) {
    await showFailureToast(error, { title: "Failed to copy icon" });
  }
}
