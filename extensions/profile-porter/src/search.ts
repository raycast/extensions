import { LaunchProps } from "@raycast/api";
import { porterLink, send } from "./porter";

export default async function Command(props: LaunchProps<{ arguments: { query: string } }>) {
  await send(porterLink("search", { q: props.arguments.query.trim() }));
}
