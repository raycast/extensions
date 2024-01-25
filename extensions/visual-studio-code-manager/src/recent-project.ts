/* eslint-disable @typescript-eslint/no-unused-vars */
import { homedir } from "os";
import fse from "fs-extra";
import { default as path } from "path";
import { CacheProjectEntity, ProjectEntry } from "./types";

function getDefaultRencentJSON() {
  return { list: [] };
}

const TARGET_DIR = path.resolve(homedir(), ".raycast_extension_vscode_manager/cache_project");

fse.ensureDirSync(TARGET_DIR);

export const RECENT_PROJECT_JSON = path.resolve(TARGET_DIR, "recent.json");

if (!fse.pathExistsSync(RECENT_PROJECT_JSON)) {
  fse.writeJSONSync(RECENT_PROJECT_JSON, { list: [] });
}

class RecentProject {
  rencentProjectList: CacheProjectEntity["list"] = [];

  async readRecentJSON(): Promise<CacheProjectEntity> {
    try {
      return await fse.readJSON(RECENT_PROJECT_JSON);
    } catch (error) {
      console.error(error);
      return getDefaultRencentJSON();
    }
  }

  async updateRecentJSON(obj: ProjectEntry) {
    try {
      if (obj) {
        const newList = this.rencentProjectList.filter((item) => item.rootPath !== obj.rootPath);
        newList.unshift(obj);
        this.rencentProjectList = newList.slice(0, 3);
        await fse.writeJSON(RECENT_PROJECT_JSON, {
          list: this.rencentProjectList,
        });
      }
    } catch (error) {
      console.error(error);
    }
  }

  async getRecentProject() {
    const recentProjectData = await this.readRecentJSON();
    this.rencentProjectList = recentProjectData.list;
    return recentProjectData;
  }
}

const recentProject = new RecentProject();

export default recentProject;
