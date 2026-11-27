import { List } from "@raycast/api";
import { type DropItem, extractUrl, formatBytes } from "./api";
import { escapeMarkdown, getDropKind } from "./content";
import ImagePreview from "./image-preview";

export default function DropDetail({ item }: { item: DropItem }) {
  const kind = getDropKind(item);
  const url = kind === "link" ? extractUrl(item.text) : null;
  const preview = item.linkPreview;
  const labels = {
    text: "Text",
    link: "Link",
    image: "Image",
    video: "Video",
    audio: "Audio",
    pdf: "PDF",
    file: "File",
  };
  const metadata = (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Type" text={labels[kind]} />
      <List.Item.Detail.Metadata.Label title="Device" text={item.device || "Unknown"} />
      <List.Item.Detail.Metadata.Label title="Size" text={formatBytes(item.size)} />
      <List.Item.Detail.Metadata.Label title="Created" text={new Date(item.createdAt).toLocaleString()} />
      {item.pinned && <List.Item.Detail.Metadata.Label title="Pinned" text="Yes" />}
      {preview?.siteName && <List.Item.Detail.Metadata.Label title="Site" text={preview.siteName} />}
      {url && <List.Item.Detail.Metadata.Link title="URL" text={new URL(url).hostname} target={url} />}
    </List.Item.Detail.Metadata>
  );

  if (kind === "image") return <ImagePreview item={item} metadata={metadata} />;

  let markdown: string;
  if (kind === "link") {
    const image = extractUrl(preview?.image);
    markdown = [
      image ? `![Link preview](<${image.replace(/>/g, "%3E").replace(/</g, "%3C")}>)` : "",
      `# ${escapeMarkdown(preview?.title || new URL(url!).hostname)}`,
      preview?.description ? escapeMarkdown(preview.description) : "",
      escapeMarkdown(item.text ?? ""),
      !preview && item.previewStatus === "pending" ? "Link preview is being prepared…" : "",
    ]
      .filter(Boolean)
      .join("\n\n");
  } else if (kind === "text") {
    markdown = escapeMarkdown(item.text ?? "").replace(/\n/g, "  \n");
  } else {
    const hint =
      kind === "video"
        ? "Press Enter to play in your default video player."
        : kind === "audio"
          ? "Press Enter to play in your default audio player."
          : "Use Open File to view this file. Press Enter to copy.";
    markdown = `# ${escapeMarkdown(item.name || labels[kind])}\n\n${hint}`;
  }

  return <List.Item.Detail markdown={markdown} metadata={metadata} />;
}
