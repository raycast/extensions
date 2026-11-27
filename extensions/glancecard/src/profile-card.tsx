import { Detail, type LaunchProps } from "@raycast/api";
import { usePromise, withAccessToken } from "@raycast/utils";
import { LookGrid } from "./components/card-views";
import { github, parseLogin, viewerLogin } from "./lib/github";

function ProfileCard({ arguments: args }: LaunchProps<{ arguments: Arguments.ProfileCard }>) {
  const typed = args.login?.trim() ?? "";
  const login = typed ? parseLogin(typed) : null;
  // No login typed: the card of whoever signed in.
  const { data: viewer, error } = usePromise(viewerLogin, [], { execute: !typed });
  if (typed && !login) return <Detail markdown={`# "${typed}" is not a GitHub login`} />;
  if (error) return <Detail markdown={`# Could not read your GitHub\n\n${error.message}`} />;
  const who = login ?? viewer;
  if (!who) return <Detail isLoading markdown="" />;
  return <LookGrid target={{ kind: "profile", login: who }} />;
}

export default withAccessToken(github)(ProfileCard);
