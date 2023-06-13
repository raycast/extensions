import { Icon, List } from "@raycast/api";
import { getBrokenLinks } from "../api";
import { EmptyView } from "../components/empty-view";
import { BrokenLink, Site } from "../interface";
import { statusCodeToColor } from "../utils/constants";

export default function BrokenLinksCommand({ item }: { item: Site }): JSX.Element {
  const { data, isLoading } = getBrokenLinks(item);

  return (
    <List navigationTitle={`Broken Links for ${item.label}`} isLoading={isLoading}>
      <EmptyView title={data?.length ? "No Results Found" : "No Broken Links Available"} />
      {data?.map((item: BrokenLink, index: number) => {
        const statusCode = item.status_code.toString();

        return (
          <List.Item
            key={index}
            icon={{
              source: Icon.Dot,
              tintColor: statusCodeToColor(statusCode),
            }}
            title={item.crawled_url}
            subtitle={item.found_on_url}
            accessories={[{ text: statusCode }]}
          />
        );
      })}
    </List>
  );
}
