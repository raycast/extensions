import { Action } from "@raycast/api";
import { GITEE_URL } from "../utils/constants";

export function ActionToGitee() {
  return (
    <Action.OpenInBrowser title={"Go to Gitee"} shortcut={{ modifiers: ["shift", "cmd"], key: "g" }} url={GITEE_URL} />
  );
}
