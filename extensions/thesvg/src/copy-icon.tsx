import {
  Clipboard,
  LaunchProps,
  showHUD,
  showToast,
  Toast,
  getPreferenceValues,
} from "@raycast/api";
import { searchIcons, getIcon, type Preferences } from "./api";

interface Arguments {
  query: string;
}

export default async function CopyIcon(
  props: LaunchProps<{ arguments: Arguments }>,
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
    const variant =
      detail.variants[defaultVariant] ?? detail.variants["default"];

    if (!variant?.svg) {
      toast.style = Toast.Style.Failure;
      toast.title = "SVG not available for this variant";
      return;
    }

    await Clipboard.copy(variant.svg);
    toast.style = Toast.Style.Success;
    toast.title = `Copied ${match.title} SVG`;
    await showHUD(`Copied ${match.title} SVG`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to copy icon",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
