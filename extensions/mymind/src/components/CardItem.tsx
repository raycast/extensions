import { Grid, List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { MyMindObject } from "../api";
import { safeHostname } from "../utils";
import { CardActions } from "./CardAction";

const FALLBACK_ICON = "mymind-logo.svg";

export function cardIcon(obj: MyMindObject) {
  return obj.source?.url ? getFavicon(obj.source.url) : FALLBACK_ICON;
}

export function cardHostname(obj: MyMindObject): string | undefined {
  return safeHostname(obj.source?.url) ?? obj.source?.url;
}

export function GridCardItem({ object, onChange }: { object: MyMindObject; onChange?: () => void }) {
  return (
    <Grid.Item
      content={cardIcon(object)}
      title={object.title || "Untitled"}
      subtitle={cardHostname(object)}
      actions={<CardActions object={object} onChange={onChange} />}
    />
  );
}

export function ListCardItem({ object, onChange }: { object: MyMindObject; onChange?: () => void }) {
  return (
    <List.Item
      icon={cardIcon(object)}
      title={object.title || "Untitled"}
      subtitle={object.source?.url}
      accessories={[{ date: new Date(object.modified) }]}
      actions={<CardActions object={object} onChange={onChange} />}
    />
  );
}
