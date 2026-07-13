import type { Team, User } from "../types";

type DeploymentOwnerOptions = {
  deployment: { team?: Pick<Team, "slug"> };
  team?: Pick<Team, "slug">;
  username?: User["username"];
};

export function getDeploymentOwnerSlug({ deployment, team, username }: DeploymentOwnerOptions): string | undefined {
  return deployment.team?.slug || team?.slug || username;
}
