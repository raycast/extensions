import { List } from "@raycast/api";

interface SeriesDetailProps {
  content: string;
}

export function SeriesDetail({ content }: SeriesDetailProps) {
  return (
    <List>
      <List.Item title="Details" detail={<List.Item.Detail markdown={content} />} />
    </List>
  );
}
