import { LaunchProps } from "@raycast/api";
import { attempt } from "./components";
import { spaceNamed } from "./spaces-by-name";
import { newTab } from "./yab";

export default async function Command(props: LaunchProps<{ arguments: Arguments.NewTab }>) {
  const query = props.arguments.query || props.fallbackText || "";
  await attempt("Couldn't open a tab", async () => newTab(query, spaceNamed(props.arguments.space)));
}
