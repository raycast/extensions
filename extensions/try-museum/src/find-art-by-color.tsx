import type { LaunchProps } from "@raycast/api";
import { ArtworkGrid } from "./components/artwork-grid";

export default function Command(
  props: LaunchProps<{ arguments: Arguments.FindArtByColor; launchContext?: { hex?: string } }>,
) {
  const color = props.launchContext?.hex ?? props.arguments.color ?? "";
  return <ArtworkGrid key={color} initialColor={color} />;
}
