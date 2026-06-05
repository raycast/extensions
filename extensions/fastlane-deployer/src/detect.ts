import fs from "fs";
import path from "path";
import { FastlaneLane, Platform, Shell } from "./types";

export type Detection = {
  workingDirectory: string;
  fastfilePath: string;
  lanes: FastlaneLane[];
};

const candidates = [
  "fastlane/Fastfile",
  "ios/fastlane/Fastfile",
  "android/fastlane/Fastfile",
  "packages/mobile/ios/fastlane/Fastfile",
  "packages/mobile/android/fastlane/Fastfile",
];

function platformFromPath(filePath: string): Platform | undefined {
  if (filePath.includes("/ios/")) return "ios";
  if (filePath.includes("/android/")) return "android";
  return undefined;
}

function parseLanes(fastfilePath: string) {
  const contents = fs.readFileSync(fastfilePath, "utf8");
  const lanes: FastlaneLane[] = [];
  let platform = platformFromPath(fastfilePath);

  for (const line of contents.split(/\r?\n/)) {
    const platformMatch = line.match(/platform\s+:([a-zA-Z_]+)/);
    if (platformMatch?.[1] === "ios" || platformMatch?.[1] === "android")
      platform = platformMatch[1];

    const laneMatch = line.match(/lane\s+:([a-zA-Z0-9_]+)/);
    if (!laneMatch?.[1] || !platform) continue;
    const lane = laneMatch[1];
    lanes.push({
      id: `${platform}-${lane}`,
      name: `${platform.toUpperCase()} ${lane.replace(/_/g, " ")}`,
      platform,
      lane,
      command: `bundle exec fastlane ${platform} ${lane}`,
      environment: lane.includes("production")
        ? "production"
        : lane.includes("staging")
          ? "staging"
          : undefined,
      isProduction: lane.includes("production") || lane.includes("release"),
    });
  }

  return lanes;
}

export function detectFastlane(rootPath: string) {
  const detections: Detection[] = [];
  for (const candidate of candidates) {
    const fastfilePath = path.join(rootPath, candidate);
    if (!fs.existsSync(fastfilePath)) continue;
    detections.push({
      fastfilePath,
      workingDirectory: path.dirname(path.dirname(fastfilePath)),
      lanes: parseLanes(fastfilePath),
    });
  }
  return detections;
}

export function normalizeShell(value?: string): Shell {
  if (value === "bash" || value === "sh" || value === "zsh") return value;
  return "zsh";
}
