import { showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { ApplicationCache } from "./application-cache";
import { CacheType, ProjectType, SourceRepo } from "../types";
const execp = promisify(exec);

export async function buildAllProjectsCache(paths: string[], maxDepth: number): Promise<SourceRepo[]> {
  const allProjectsCache = new ApplicationCache(CacheType.ALL_PROJECTS);
  let foundRepos: SourceRepo[] = [];
  await Promise.allSettled(
    paths.map(async (path) => {
      const findCmd = `find -L ${path} -maxdepth ${maxDepth} \\( -name 'package.json' -o -name 'pom.xml' -o -name 'build.gradle' \\) -type f -not -path "*/node_modules/*"`;
      const { stdout, stderr } = await execp(findCmd);
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
    if (path.endsWith("package.json")) {
      const fullPath = path.replace("/package.json", "");
      const name = fullPath.split("/").pop() ?? "unknown";
      return {
        name: name,
        icon: "node-js.png",
        fullPath: fullPath,
        type: ProjectType.NODE,
      };
    } else if (path.endsWith("pom.xml")) {
      const fullPath = path.replace("/pom.xml", "");
      const name = fullPath.split("/").pop() ?? "unknown";
      return {
        name: name,
        icon: "maven.png",
        fullPath: fullPath,
        type: ProjectType.MAVEN,
      };
    } else if (path.endsWith("build.gradle")) {
      const fullPath = path.replace("/build.gradle", "");
      const name = fullPath.split("/").pop() ?? "unknown";
      return {
        name: name,
        icon: "gradle.png",
        fullPath: fullPath,
        type: ProjectType.GRADLE,
      };
    }

    return {
      name: "unknown",
      icon: "unknown.png",
      fullPath: path,
      type: ProjectType.UNKNOWN,
    };
  });
}
