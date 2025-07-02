import { Toast, showToast } from "@raycast/api";
import { execSync } from "child_process";
import path from "path";
import Project from "../types/project";
import fetch from "node-fetch";

const COOLIFY_API_KEY = "1|SfgiwwVucWPLwLEwkqqAkuaXr7gjDSxkvfpKMh6S03a9edee";

async function reinitGitRepo(project: Project) {
  const command = `/bin/zsh -ilc "rm -rf .git && git init"`;
  execSync(command, {
    cwd: project.fullPath,
    shell: "/bin/zsh",
  });
}

async function createGitRepo(project: Project, reinit: boolean = false, repoName: string = "") {
  showToast({
    style: Toast.Style.Animated,
    title: "Creating repository...",
  });
  if (reinit) {
    await reinitGitRepo(project);
  }

  const folderName = path.basename(project.fullPath);
  const name = repoName !== "" ? repoName : folderName;
  const command = `/bin/zsh -ilc "git init && git add . && git commit -m 'Initial commit' && gh repo create ${name} --private --source=. --push"`;

  const options = {
    cwd: project.fullPath,
    shell: "/bin/zsh",
  };

  try {
    execSync(command, options);
    showToast({
      style: Toast.Style.Success,
      title: "Repository setup completed",
      message: `Repository "${name}" has been created and pushed to GitHub.`,
    });
  } catch (execError) {
    console.error("Command execution failed:", execError);
    throw new Error(`Failed to setup repository: ${(execError as Error).message}`);
  }
}

async function getCoolifyProjects() {
  const response = await fetch("https://apps.joshuariley.co.uk/api/v1/projects", {
    headers: {
      Authorization: `Bearer ${COOLIFY_API_KEY}`,
    },
  });
  const data = await response.json();
  console.log(data);
  const newProject = {
    id: 0,
    uuid: "new",
    name: "Create New Project",
    description: "Create a new project in Coolify",
  };
  const projects = [newProject, ...(Array.isArray(data) ? data : [])];
  return projects;
}

async function createCoolifyProject(name: string) {
  const response = await fetch("https://apps.joshuariley.co.uk/api/v1/projects", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${COOLIFY_API_KEY}`,
    },
    body: JSON.stringify({
      name: name,
      description: "Created by Raycast Extension",
    }),
  });
  const data = await response.json();
  console.log(data);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function deployToCoolify(project: Project, coolifyProjectUUID: string) {
  const response = await fetch(`https://apps.joshuariley.co.uk/api/v1/applications/private-github-app`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${COOLIFY_API_KEY}`,
    },
    body: JSON.stringify({}),
  });
  const data = await response.json();
  console.log(data);
}

export { reinitGitRepo, createGitRepo, getCoolifyProjects, createCoolifyProject };
