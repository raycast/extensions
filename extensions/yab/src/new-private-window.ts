import { LaunchProps } from "@raycast/api";
import { attempt } from "./components";
import { resolve } from "./data";
import { newPrivateWindow } from "./yab";

export default async function Command(props: LaunchProps<{ arguments: Arguments.NewPrivateWindow }>) {
  const query = (props.arguments.query || props.fallbackText || "").trim();
  await attempt("Couldn't open a private window", async () =>
    newPrivateWindow(query ? await resolve(query) : undefined),
  );
}
