import { List, Icon } from "@raycast/api";

export default function InvalidGeohash() {
  return <List.Item title="The entered geohash contains invalid characters" icon={Icon.ExclamationMark} />;
}
