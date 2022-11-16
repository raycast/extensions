import { List, Icon } from "@raycast/api";

export default function InvalidCoordinates() {
  return <List.Item title="Invalid coordinates entered" icon={Icon.ExclamationMark} />;
}
