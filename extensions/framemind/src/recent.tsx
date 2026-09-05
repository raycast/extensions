import { Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { AssetActions } from "./search";
import { framemind, rows } from "./framemind";

export default function Recent() {
  const { data, isLoading } = usePromise(async () =>
    rows(await framemind(["search", "today", "--limit", "50"])),
  );
  return (
    <List isLoading={isLoading}>
      {(data ?? []).map((item) => (
        <List.Item
          key={item.assetID}
          icon={Icon.Clock}
          title={item.filename}
          actions={<AssetActions item={item} />}
        />
      ))}
    </List>
  );
}
