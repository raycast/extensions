import { PlanetScaleColor } from "./colors";
import { Branch, Database, DeployRequest } from "./api";
import { titleCase } from "./utils";
import { Color, Image } from "@raycast/api";

export function getDeployRequestIcon(deployRequest: DeployRequest) {
  if (deployRequest.deployment_state.startsWith("complete")) {
    return {
      source: "deploy-deployed.svg",
      tintColor: PlanetScaleColor.Purple,
      tooltip: titleCase(deployRequest.deployment_state),
    };
  }

  if (deployRequest.deployment_state === "queued") {
    return {
      source: "deploy-closed.svg",
      tintColor: PlanetScaleColor.Yellow,
      tooltip: titleCase(deployRequest.deployment_state),
    };
  }

  if (deployRequest.deployment_state !== "ready") {
    return {
      source: "deploy-open.svg",
      tintColor: PlanetScaleColor.Yellow,
      tooltip: titleCase(deployRequest.deployment_state),
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

export function getBranchIcon(branch: Branch) {
  // TODO: Remove any when the API docs are updated
  if ((branch as any).state === "sleeping") {
    return {
      source: "branch-sleep.svg",
      tintColor: Color.SecondaryText,
    };
  }

  return {
    source: "branch.svg",
    tintColor: PlanetScaleColor.Blue,
  };
}

export function getDatabaseIcon(database: Database) {
  return {
    source: database.state === "sleeping" ? "database-sleep.svg" : "database.svg",
    tintColor: PlanetScaleColor.Blue,
  };
}

export function getUserIcon(user: { avatar_url: string; display_name: string }) {
  return {
    source: user.avatar_url,
    mask: Image.Mask.Circle,
  };
}
