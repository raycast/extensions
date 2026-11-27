import { type LaunchProps } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { LookGrid } from "./components/card-views";
import { RepositoryList } from "./components/repository-list";
import { github, parseRepository } from "./lib/github";

function RepositoryCard({ arguments: args }: LaunchProps<{ arguments: Arguments.RepositoryCard }>) {
  const typed = parseRepository(args.repository ?? "");
  if (typed) return <LookGrid target={{ kind: "repo", full: typed }} />;
  return <RepositoryList initial={args.repository?.trim() ?? ""} />;
}

export default withAccessToken(github)(RepositoryCard);
