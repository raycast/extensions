import { Icon, Image, List } from "@raycast/api";

/**
 * A message in place of a screen's content, for a screen that is locked or empty. List.EmptyView
 * cannot do this: the Survivor row is always in the list, so it would never show.
 */
export function Notice(props: { icon: Image.ImageLike; title: string; description: string }) {
  return (
    <List.Item
      title={props.title}
      subtitle={props.description}
      icon={props.icon ?? Icon.Lock}
      detail={<List.Item.Detail markdown={`# ${props.title}\n\n${props.description}`} />}
    />
  );
}
