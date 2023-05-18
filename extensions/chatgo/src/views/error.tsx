import { Icon, Image, List } from "@raycast/api";

export const Error = (props: { title?: string; description?: string; icon?: Image.ImageLike }) => {
  const {
    title = "Error",
    description = "Encountered some problems, please try again.",
    icon = Icon.XMarkCircleFilled,
  } = props;
  return <List.EmptyView title={title} description={description} icon={icon} />;
};
