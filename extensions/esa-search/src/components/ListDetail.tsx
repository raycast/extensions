import { Icon, List } from "@raycast/api";
import { Post } from "@suin/esa-api";
import dayjs from "dayjs";

type Props = {
  item: Post;
};

const ListDetail = ({ item }: Props) => (
  <List.Item.Detail
    markdown={item.body_md}
    metadata={
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label
          title="category"
          icon={{ source: Icon.Folder }}
          text={item.full_name.replace(item.name, "")}
        />
        <List.Item.Detail.Metadata.Label title="url" icon={{ source: Icon.Link }} text={item.url} />
        <List.Item.Detail.Metadata.Label
          title="updated"
          icon={{ source: Icon.Clock }}
          text={dayjs(item.updated_at).format("YYYY-MM-DD HH:mm")}
        />
        <List.Item.Detail.Metadata.Label title="updated_by" icon={item.updated_by.icon} text={item.updated_by.name} />
        <List.Item.Detail.Metadata.Label title="tags" icon={{ source: Icon.Tag }} text={item.tags.join(", ")} />
      </List.Item.Detail.Metadata>
    }
  />
);

export default ListDetail;
