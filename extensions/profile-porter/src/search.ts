import { LaunchProps } from "@raycast/api";
import { porterLink, send } from "./porter";

export default async function Command(props: LaunchProps<{ arguments: Arguments.Search }>) {
  await send(porterLink("search", { q: props.arguments.query.trim() }));
}
