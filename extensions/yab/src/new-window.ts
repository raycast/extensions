import { LaunchProps } from "@raycast/api";
import { attempt } from "./components";
import { spaceNamed } from "./spaces-by-name";
import { newWindow } from "./yab";

export default async function Command(props: LaunchProps<{ arguments: Arguments.NewWindow }>) {
  await attempt("Couldn't open a window", async () => newWindow({ spaceId: spaceNamed(props.arguments.space) }));
}
