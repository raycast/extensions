import { List } from "@raycast/api";
import { getMixedContent } from "../api";
import { EmptyView } from "../components/empty-view";
import { Site } from "../interface";

export default function MixedContentCommand({ item }: { item: Site }): JSX.Element {
  const { data, isLoading } = getMixedContent(item);

  return (
    <List navigationTitle={`Mixed Content for ${item.label}`} isLoading={isLoading}>
      <EmptyView title={data?.length ? "No Results Found" : "No Mixed Content Available"} />
      {data?.map((item: any, index: number) => {
        return (
          <List.Item
            key={index}
            title={item.mixed_content_url}
            subtitle={item.found_on_url}
            accessories={[{ text: item.element_name }]}
          />
        );
      })}
    </List>
  );
}
