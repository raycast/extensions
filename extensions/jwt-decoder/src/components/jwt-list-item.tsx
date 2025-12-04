import { TokenItem } from "../utils/list-from-object";
import { JWSHeaderParameters, JWTPayload } from "jose";
import { dataColor, headColor } from "../constants";
import { Icon, List } from "@raycast/api";
import { displayValue } from "../utils/display-value";
import { JwtItemActionPanel } from "./jwt-item-action-panel";

interface JwtListItemProps {
  type: string;
  item: TokenItem;
  detail: List.Item.Props["detail"];
  data: JWTPayload;
  header: JWSHeaderParameters;
  showDetail: boolean;
  toggleShowDetail: () => void;
}

export function JwtListItem({ type, item, detail, data, header, showDetail, toggleShowDetail }: JwtListItemProps) {
  const tintColor = type === "head" ? headColor : dataColor;
  const accessories =
    item.row && !showDetail ? [{ text: item.row[1] }, { icon: { source: Icon.QuestionMark } }] : undefined;
  return (
    <List.Item
      id={`${type}.${item.key}`}
      key={item.key}
      title={item.key}
      subtitle={displayValue(item.value, item.key)}
      detail={detail}
      actions={<JwtItemActionPanel {...{ data, header, showDetail, toggleShowDetail, item }} />}
      accessories={accessories}
      icon={{ source: Icon.Plus, tintColor }}
    />
  );
}
