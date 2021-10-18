import { preferences } from "@raycast/api";
import { exec } from "child_process";
import fs from "fs";
import Fuse from "fuse.js";
import { promisify } from "util";
import DockerContainer from "../dto/docker-container";
import DockerProject from "../dto/docker-project";

const execp = promisify(exec);

export class DockerService {
  public async getProjects(searchQuery: string | undefined): Promise<DockerProject[]> {
    const dockerCliPath = preferences.dockerCliPath.value as string;

    const { stdout } = await execp(
      dockerCliPath +
        ' ps --format \'{{.ID}};{{.State}};{{.Label "com.docker.compose.project"}};{{.Names}};{{.Label "com.docker.compose.project.working_dir"}}\' --all'
    );

    const lines = stdout.split(/\r?\n/);
    const containers = lines
      .filter((l) => l.length > 0)
      .map((line: string) => {
        const parts = line.split(";");

        return new DockerContainer(parts[0], parts[1], parts[2], parts[3], parts[4]);
      })
      .sort(function (a, b) {
        return ("" + a.Project).localeCompare(b.Project) && ("" + b.State).localeCompare(a.State);
      });

    const projects: DockerProject[] = [];

    containers.forEach((container) => {
      const projectIndex = projects.findIndex((p) => p.Title === container.Project);

      if (projectIndex === -1) {
        projects.push(new DockerProject(container.Project, container.WorkingDir, container.Project, [container]));
      } else {
        projects[projectIndex].Containers.push(container);
      }
    });

    const results = this.searchProjects(projects, { keys: ["Title", "Containers.*.Project"] }, searchQuery);

    return results;
  }

  private searchProjects<DockerProject>(
    items: DockerProject[],
    options: Fuse.IFuseOptions<DockerProject>,
    searchQuery: string | undefined
  ): DockerProject[] {
    const index = new Fuse(items, options);

    if (!searchQuery) {
      return items;
    }

    return index.search(searchQuery as string).map((i) => i.item);
  }

  public async getContainers(searchQuery: string | undefined): Promise<DockerContainer[]> {
    const dockerCliPath = preferences.dockerCliPath.value as string;

    const { stdout } = await execp(
      dockerCliPath +
        ' ps --format \'{{.ID}};{{.State}};{{.Label "com.docker.compose.project"}};{{.Names}};{{.Label "com.docker.compose.project.working_dir"}}\' --all'
    );

    const containerLines = stdout.split(/\r?\n/);
    const dockerContainers = containerLines
      .filter((l) => l.length > 0)
      .map((containerLine: string) => {
        const parts = containerLine.split(";");

        return new DockerContainer(parts[0], parts[1], parts[2], parts[3], parts[4]);
      })
      .filter((container) => container.getTitle.length > 0)
      .sort(function (a, b) {
        return ("" + a.Project).localeCompare(b.Project) && ("" + b.State).localeCompare(a.State);
      });

    const results = this.searchContainers(dockerContainers, { keys: ["Project", "Names"] }, searchQuery);

    return results;
  }

  private searchContainers<DockerContainer>(
    items: DockerContainer[],
    options: Fuse.IFuseOptions<DockerContainer>,
    searchQuery: string | undefined
  ): DockerContainer[] {
    const index = new Fuse(items, options);

    if (!searchQuery) {
      return items;
    }

    return index.search(searchQuery as string).map((i) => i.item);
  }

  public dockerCliIsInstalled(): boolean {
    if (preferences.dockerCliPath === undefined) {
      return false;
    }

    const path = preferences.dockerCliPath?.value as string;

    try {
      if (fs.existsSync(path)) {
        return true;
      }

      return false;
    } catch (e) {
      return false;
    }
  }

  public dockerCliRequiredMessage(): string {
    const dockerCliPath = preferences.dockerCliPath.value as string;

    return `
# Docker CLI not installed

It looks like the Docker CLI Command Line Interface is not installed at the defined path: "${dockerCliPath}". You can change this path in the extension settings.

The Docker CLI is used to manage the Docker Containers and Projcts in the extention. You can find more information about how to install Docker for Mac over [here](https://docs.docker.com/desktop/mac/install/).
        `;
  }
}
