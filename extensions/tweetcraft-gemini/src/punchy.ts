import type { LaunchProps } from "@raycast/api";
import { runRewrite } from "./run-rewrite";
import type { RewriteArguments } from "./types";

export default async function Command(props: LaunchProps<{ arguments: RewriteArguments }>) {
  await runRewrite(props, "punchy");
}
