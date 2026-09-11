import { List } from "@raycast/api";
import { SECRET_STRING } from "../config";

export default function SecretListItem({ title, text, show }: { title: string; text: string; show: boolean }) {
  return <List.Item.Detail.Metadata.Label title={title} text={show ? text : SECRET_STRING} />;
}
