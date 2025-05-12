import path from "path";
import { runScript } from "./run-script";
import { environment } from "@raycast/api";

export async function getFinderSelection(): Promise<string[]> {
  const FinderSelectionScript = path.join(environment.assetsPath, "scripts", "finder.scpt");
  const result = await runScript<string>(FinderSelectionScript, {
    language: "AppleScript",
    stderrCallback: (err) => console.log(err),
  }).data;

  if (typeof result === "string") {
    return result.split(",").map((x) => x.trim());
  } else {
    return result;
  }
}

export async function getHoudahSpotSelection(): Promise<string[]> {
  const HoudahSpotSelectionScript = path.join(environment.assetsPath, "scripts", "houdahSpot.scpt");
  const result = await runScript<string[]>(HoudahSpotSelectionScript, {
    language: "AppleScript",
    stderrCallback: (err) => console.log(err),
  }).data;

  if (typeof result === "string") {
    return result.split(",").map((x) => x.trim());
  } else {
    return result;
  }
}

export async function getNeoFinderSelection(): Promise<string[]> {
  const NeoFinderSelectionScript = path.join(environment.assetsPath, "scripts", "neofinder.scpt");
  const result = await runScript<string[]>(NeoFinderSelectionScript, {
    language: "AppleScript",
    stderrCallback: (err) => console.log(err),
  }).data;

  if (typeof result === "string") {
    return result.split(",").map((x) => x.trim());
  } else {
    return result;
  }
}

export async function getPathFinderSelection(): Promise<string[]> {
  const PathFinderSelectionScript = path.join(environment.assetsPath, "scripts", "pathfinder.scpt");
  const result = await runScript<string[]>(PathFinderSelectionScript, {
    language: "JXA",
    stderrCallback: (err) => console.log(err),
  }).data;
  return result as string[];
}

export async function getQSpaceSelection(): Promise<string[]> {
  const QSpaceSelectionScript = path.join(environment.assetsPath, "scripts", "qspace.scpt");
  const result = await runScript<string[]>(QSpaceSelectionScript, {
    language: "JXA",
    stderrCallback: (err) => console.log(err),
  }).data;

  if (typeof result === "string") {
    return result.split(",").map((x) => x.trim());
  } else {
    return result;
  }
}

export async function getForkLiftSelection(): Promise<string[]> {
  const ForkLiftSelectionScript = path.join(environment.assetsPath, "scripts", "forklift-beta.scpt");
  const result = await runScript<string[]>(ForkLiftSelectionScript, {
    language: "JXA",
    stderrCallback: (err) => console.log(err),
  }).data;

  if (typeof result === "string") {
    return result.split(",").map((x) => x.trim());
  } else {
    return result;
  }
}
