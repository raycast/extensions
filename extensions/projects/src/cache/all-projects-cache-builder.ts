import { showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { ApplicationCache } from "./application-cache";
import { CacheType, ProjectType, SourceRepo } from "../types";
import { v4 as uuidv4 } from "uuid";
const execp = promisify(exec);

export async function buildAllProjectsCache(paths: string[], projectTypes: ProjectType[]): Promise<SourceRepo[]> {
  const allProjectsCache = new ApplicationCache(CacheType.ALL_PROJECTS);
  let foundRepos: SourceRepo[] = [];
  await Promise.allSettled(
    paths.map(async (path) => {
      let spotlightSearchParameters: string[] = [];

      if (projectTypes.length == 0 || projectTypes.includes(ProjectType.XCODE)) {
        spotlightSearchParameters = [
          ...spotlightSearchParameters,
          "kMDItemDisplayName == *.xcodeproj",
          "kMDItemDisplayName == *.xcworkspace",
          "kMDItemDisplayName == Package.swift",
          "kMDItemDisplayName == *.playground",
        ];
      }

      if (projectTypes.length == 0 || projectTypes.includes(ProjectType.GRADLE)) {
        spotlightSearchParameters = [...spotlightSearchParameters, "kMDItemDisplayName == build.gradle"];
      }

      if (projectTypes.length == 0 || projectTypes.includes(ProjectType.MAVEN)) {
        spotlightSearchParameters = [...spotlightSearchParameters, "kMDItemDisplayName == pom.xml"];
      }

      if (projectTypes.length == 0 || projectTypes.includes(ProjectType.NODE)) {
        spotlightSearchParameters = [...spotlightSearchParameters, "kMDItemDisplayName == package.json"];
      }

      // Execute command
      const { stdout, stderr } = await execp(
        `mdfind -onlyin ${path} '${spotlightSearchParameters.join(" || ")}' | grep -v "node_modules\\|META-INF"`
      );

      if (stderr) {
        showToast(Toast.Style.Failure, "Find Failed", stderr);
        console.error(`error: ${stderr}`);
        return [];
      }
      const repoPaths = stdout.split("\n").filter((e) => e);
      const repos = parseRepoPaths(repoPaths);
      foundRepos = foundRepos.concat(repos);
    })
  );

  foundRepos.sort((a, b) => {
    const fa = a.name.toLowerCase(),
      fb = b.name.toLowerCase();
    if (fa < fb) {
      return -1;
    }
    if (fa > fb) {
      return 1;
    }
    return 0;
  });
  allProjectsCache.setCache(foundRepos);
  allProjectsCache.save();
  return foundRepos;
}

function parseRepoPaths(repoPaths: string[]): SourceRepo[] {
  return repoPaths.map((path) => {
    const uuid = uuidv4();
    if (path.endsWith("package.json")) {
      const fullPath = path.replace("/package.json", "");
      const name = fullPath.split("/").pop() ?? "unknown";
      return {
        id: uuid,
        name: name,
        icon: "node-js.png",
        fullPath: fullPath,
        type: ProjectType.NODE,
      };
    } else if (path.endsWith("pom.xml")) {
      const fullPath = path.replace("/pom.xml", "");
      const name = fullPath.split("/").pop() ?? "unknown";
      return {
        id: uuid,
        name: name,
        icon: "maven.png",
        fullPath: fullPath,
        type: ProjectType.MAVEN,
      };
    } else if (path.endsWith("build.gradle")) {
      const fullPath = path.replace("/build.gradle", "");
      const name = fullPath.split("/").pop() ?? "unknown";
      return {
        id: uuid,
        name: name,
        icon: "gradle.png",
        fullPath: fullPath,
        type: ProjectType.GRADLE,
      };
    } else if (path.endsWith(".xcodeproj") || path.endsWith(".xcworkspace") || path.endsWith("Package.swift")) {
      const fullPath = path.substring(0, path.lastIndexOf("/"));
      const name = path.split("/").pop() ?? "unknown";
      return {
        id: uuid,
        name: name,
        icon: "xcode.png",
        fullPath: fullPath,
        type: ProjectType.XCODE,
      };
    } else if (path.endsWith(".playground")) {
      const name = path.split("/").pop() ?? "unknown";
      return {
        id: uuid,
        name: name,
        icon: "xcode.png",
        fullPath: path,
        type: ProjectType.XCODE,
      };
    }

    return {
      id: uuid,
      name: "unknown",
      icon: "unknown.png",
      fullPath: path,
      type: ProjectType.UNKNOWN,
    };
  });
}
