import { List } from "@raycast/api";
import { PRODUCT_ICON, PRODUCT_TITLE } from "../constantsBridge";
import { BridgeSupportedOS, BridgeVersion } from "../interface";
import Actions from "./BridgeActionItems";

interface Props {
  data?: BridgeVersion;
  os: BridgeSupportedOS;
}

const ListItem = ({ data, os }: Props) => {
  if (!data) {
    return null;
  }

  const date = new Date(data.ReleaseDate);

  return (
    <List.Item
      title={PRODUCT_TITLE[os]}
      subtitle={data.Version}
      accessories={[{ date: date, tooltip: `Deployed Date: ${date.toLocaleString()}` }]}
      icon={{ source: PRODUCT_ICON[os] }}
      actions={<Actions data={data} />}
    />
  );
};

export default ListItem;
