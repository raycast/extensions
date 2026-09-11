import { Detail } from "@raycast/api";

interface SeriesDetailProps {
  content: string;
}

export function SeriesDetail({ content }: SeriesDetailProps) {
  return <Detail markdown={content} />;
}
