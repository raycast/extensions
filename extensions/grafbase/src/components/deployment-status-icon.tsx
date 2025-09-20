import { Color, Icon } from "@raycast/api";

import { DeploymentStatus } from "../gql/graphql";

export const DeploymentStatusIcon = (status: DeploymentStatus) => {
  switch (status) {
    case DeploymentStatus.Failed:
      return { source: Icon.ExclamationMark, tintColor: Color.Red };
    case DeploymentStatus.InProgress:
    case DeploymentStatus.Queued:
      return { source: Icon.Dot, tintColor: Color.Blue };
    case DeploymentStatus.Succeeded:
      return { source: Icon.Dot, tintColor: Color.Green };
  }
};
