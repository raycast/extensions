import { List } from "@raycast/api";
import statuscodes from "./statuscodes.json";

export default function Command() {
  return (
    <List filtering={true} isShowingDetail>
      {Object.entries(statuscodes).map(([code, item]) => (
        <List.Item
          title={`${item.code} - ${item.message}`}
          key={item.code}
          detail={<List.Item.Detail markdown={`# ${item.code} – ${item.message}\n${item.description}`} />}
        ></List.Item>
      ))}
    </List>
  );
}
