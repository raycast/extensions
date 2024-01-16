import { PlanetScaleColor } from "../colors";
import { DeployRequest } from "../api";
import { capitalize } from "lodash";

export function getDeployRequestIcon(deployRequest: DeployRequest) {
  if (deployRequest.deployment_state.startsWith("complete")) {
    return {
      source: "deploy-deployed.svg",
      tintColor: PlanetScaleColor.Purple,
      tooltip: capitalize(deployRequest.deployment_state),
    };
  }

  if (deployRequest.deployment_state !== "ready") {
    return {
      source: "deploy-open.svg",
      tintColor: PlanetScaleColor.Yellow,
      tooltip: capitalize(deployRequest.deployment_state),
    };
  }

  switch (deployRequest.state) {
    case "open":
      return {
        source: "deploy-open.svg",
        tintColor: PlanetScaleColor.Green,
        tooltip: "Open",
      };
    case "closed":
      return {
        source: "deploy-closed.svg",
        tintColor: PlanetScaleColor.Red,
        tooltip: "Closed",
      };
  }
}
