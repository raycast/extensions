import { Action, Icon } from "@raycast/api";
import { githubRepositoryUrl } from "../project";
export function ProjectAction() {
  const url = githubRepositoryUrl();
  return url ? <Action.OpenInBrowser title={"Star on GitHub"} icon={Icon.Star} url={url} /> : null;
}
