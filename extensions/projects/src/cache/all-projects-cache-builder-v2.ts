import { showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { ApplicationCache } from "./application-cache";
import { CacheType, Preferences, ProjectConfig, SourceRepo } from "../types";
import { v4 as uuidv4 } from "uuid";
import applicationConfig from "./../application-config.json";
import { isProjectTypeEnabled } from "../common-utils";

const execp = promisify(exec);

export async function buildAllProjectsCache(paths: string[], preferences: Preferences): Promise<SourceRepo[]> {
  const allProjectsCache = new ApplicationCache(CacheType.ALL_PROJECTS);
  let foundRepos: SourceRepo[] = [];

  const projectConfig: ProjectConfig[] = applicationConfig.projectTypes as ProjectConfig[];

  await Promise.allSettled(
    paths.map(async (path) => {
      let spotlightSearchParameters: string[] = [];

      projectConfig.forEach((project) => {
        if (isProjectTypeEnabled(project.openWithKey, preferences)) {
          spotlightSearchParameters = [...spotlightSearchParameters, ...project.spotlightQuery];
        }
      });

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
      const repos = parseRepoPaths(repoPaths, projectConfig);
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

function parseRepoPaths(repoPaths: string[], projectConfig: ProjectConfig[]): SourceRepo[] {
  const repos: SourceRepo[] = [];
  repoPaths.forEach((path) => {
    projectConfig.forEach((project) => {
      if (path.endsWith(project.finder)) {
        if (project.finderType === "file") {
          repos.push(handleFileBasedProject(path, project));
        } else if (project.finderType === "extension") {
          repos.push(handleExtensionBasedProject(path, project));
        }
      }
    });
  });
  return repos;
}

const handleFileBasedProject = (path: string, projectConfig: ProjectConfig): SourceRepo => {
  const uuid = uuidv4();
  const fullPath = path.replace(`/${projectConfig.finder}`, "");
  const name = fullPath.split("/").pop() ?? "unknown";
  return {
    id: uuid,
    name: name,
    icon: projectConfig.icon,
    fullPath: fullPath,
    type: projectConfig.type,
    openWithKey: projectConfig.openWithKey,
  };
};

const handleExtensionBasedProject = (path: string, projectConfig: ProjectConfig): SourceRepo => {
  const uuid = uuidv4();
  const fullPath = path.substring(0, path.lastIndexOf("/"));
  const name = path.split("/").pop() ?? "unknown";
  return {
    id: uuid,
    name: name,
    icon: projectConfig.icon,
    fullPath: fullPath,
    type: projectConfig.type,
    openWithKey: projectConfig.openWithKey,
  };
};
