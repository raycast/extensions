import type { ManagementSchemas } from "@paynow-gg/typescript-sdk";
import { List } from "@raycast/api";
import { useMemo } from "react";

const TagListItem = ({
  actions,
  detail,
  quickLook,
  tag,
}: { tag: ManagementSchemas["TagDto"] } & Pick<List.Item.Props, "actions" | "detail" | "quickLook">) => {
  const keywords = useMemo<string[]>(() => {
    const kw = [tag.id, tag.slug];
    if (tag.name) {
      kw.push(tag.name);
    }
    return kw;
  }, [tag.id, tag.slug, tag.name]);

  return (
    <List.Item
      id={tag.id}
      key={tag.id}
      title={tag.name}
      keywords={keywords}
      actions={actions}
      detail={detail}
      icon={tag.image_url || undefined}
      quickLook={quickLook}
    />
  );
};

export default TagListItem;
