import { Detail } from "@raycast/api";
import { EXTENSION_TITLE } from "../constants";

interface ImageViewProps {
  image: string;
  metadata?: React.ReactNode;
  actions?: React.ReactNode;
  navigationTitle?: string;
  width?: number;
  height?: number;
}

export default function ImageView({
  image,
  metadata,
  navigationTitle = EXTENSION_TITLE,
  actions,
  width,
  height,
}: ImageViewProps) {
  const params = new URLSearchParams({
    "raycast-width": width?.toString() ?? "",
    "raycast-height": height?.toString() ?? "",
  });

  const query = params.toString();
  const markdown = `![](${image}${query ? `?${query}` : ""})`;

  return <Detail markdown={markdown} navigationTitle={navigationTitle} metadata={metadata} actions={actions} />;
}
