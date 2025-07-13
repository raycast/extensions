import { Detail, Icon } from "@raycast/api";

export default function TitleMetadataLabel({ title, isLiked }: { title: string; isLiked: boolean }) {
  return <Detail.Metadata.Label title="Title" text={(isLiked ? "👍 " : "") + title} icon={Icon.Music} />;
}
