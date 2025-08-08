import {
  List,
  LocalStorage,
  getPreferenceValues,
  Action,
  ActionPanel,
  open,
  showToast,
  Toast,
  Form,
  Icon,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { Category } from "./types/category";
import { reinitGitRepo } from "./utils/functions";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import Project from "./types/project";
import ProjectSettings from "./types/projectSettings";
import { createGitRepo, getCoolifyProjects, createCoolifyProject, deployToCoolify } from "./utils/functions";
import CoolifyProject from "./types/coolifyProject";
import EditProjectSettingsForm from "./forms/editProjectSettingsForm";
import getGithubRepoRemote from "./tools/getGithubRepoRemote";
import CoolifyApp from "./types/coolifyApp";
import getAllCoolifyApps from "./tools/getAllCoolifyApps";
import openProject from "./tools/openProject";

interface Preferences {
  projectsFolder: string;
}

interface ProjectWithLastOpened extends Project {
  lastOpened?: number;
}

export default function Command() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [projects, setProjects] = useState<ProjectWithLastOpened[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filteredProjects, setFilteredProjects] = useState<ProjectWithLastOpened[]>([]);
  const [projectSettings, setProjectSettings] = useState<ProjectSettings[]>([]);
  const [coolifyApps, setCoolifyApps] = useState<CoolifyApp[]>([]);
  useEffect(() => {
    loadCategoriesAndProjects();
  }, []);

  useEffect(() => {
    getAllCoolifyApps().then((apps) => {
      setCoolifyApps(apps);
    });
  }, []);

  async function loadCategoriesAndProjects() {
    try {
      const storedCategories = await LocalStorage.getItem("categories");
      const lastOpenedTimes = JSON.parse((await LocalStorage.getItem("lastOpenedTimes")) || "{}") as Record<
        string,
        number
      >;
      const projectAliases = JSON.parse((await LocalStorage.getItem("project_aliases")) || "{}") as Record<
        string,
        string[]
      >;
      const { projectsFolder } = getPreferenceValues<Preferences>();

      if (storedCategories) {
        const parsedCategories = JSON.parse(storedCategories as string);
        setCategories(parsedCategories);

        // LocalStorage.setItem("templates", JSON.stringify([]));

        // if (allTemplates.length == 0) {
        //   for (const category of parsedCategories) {
        //     createTemplate({
        //       id: generateRandomId(),
        //       name: "Default",
        //       category: category.name,
        //       type: category.type,
        //       command: category.command,
        //       templatePath: category.templatePath,
        //       autoCreateRepo: category.autoCreateRepo,
        //       setupCommand: category.setupCommand
        //     });
        //     await new Promise(resolve => setTimeout(resolve, 1000));
        //     console.log("Created template for " + category.name);
        //   }
        // }

        const allProjects: ProjectWithLastOpened[] = [];

        for (const category of parsedCategories) {
          const categoryPath = path.join(projectsFolder, category.folderName);
          if (fs.existsSync(categoryPath)) {
            const projectFolders = fs.readdirSync(categoryPath, { withFileTypes: true });

            for (const folder of projectFolders) {
              if (folder.isDirectory()) {
                const fullPath = path.join(categoryPath, folder.name);
                if (allProjects.find((p) => p.fullPath === fullPath)) {
                  continue;
                }
                allProjects.push({
                  name: folder.name,
                  categoryName: category.name,
                  fullPath: fullPath,
                  lastOpened: lastOpenedTimes[fullPath] || 0,
                  aliases: projectAliases[fullPath] || [],
                });
              }
            }
          }
        }

        const projectSettings = JSON.parse(
          (await LocalStorage.getItem<string>("projectSettings")) || "[]",
        ) as ProjectSettings[];
        for (const project of allProjects) {
          if (!projectSettings.find((p) => p.projectID === project.name)) {
            projectSettings.push({
              projectID: project.name,
              initialVersion: "1.0.0",
            });
          }
        }
        await LocalStorage.setItem("projectSettings", JSON.stringify(projectSettings));
        setProjectSettings(projectSettings);
        const sortedProjects = allProjects.sort((a, b) => {
          if (a.lastOpened !== b.lastOpened) {
            return (b.lastOpened || 0) - (a.lastOpened || 0);
          }
          return a.name.localeCompare(b.name);
        });

        setProjects(sortedProjects);
        setFilteredProjects(sortedProjects);
      }
    } catch (error) {
      console.error("Failed to load categories and projects:", error);
    } finally {
      setIsLoading(false);
    }
  }

  function hasGitRepository(project: Project): boolean {
    try {
      const gitPath = path.join(project.fullPath, ".git");
      const hasRepo = fs.existsSync(gitPath);

      if (!hasRepo) {
        return false;
      }

      // Check for remote by reading git config
      const configPath = path.join(gitPath, "config");
      if (fs.existsSync(configPath)) {
        const config = fs.readFileSync(configPath, "utf8");
        return config.includes("[remote");
      }

      return false;
    } catch (error) {
      console.error(`Error checking git repository for ${project.name}:`, error);
      return false;
    }
  }

  function getGitRepoUrl(project: Project): string | null {
    try {
      const gitPath = path.join(project.fullPath, ".git");
      const configPath = path.join(gitPath, "config");

      if (!fs.existsSync(configPath)) {
        return null;
      }

      const config = fs.readFileSync(configPath, "utf8");
      const urlMatch = config.match(/url = (.+)/);

      if (urlMatch && urlMatch[1]) {
        // Clean up the URL - remove .git suffix and any trailing whitespace
        return urlMatch[1].trim().replace(/\.git$/, "");
      }

      return null;
    } catch (error) {
      console.error(`Error getting git repo URL for ${project.name}:`, error);
      return null;
    }
  }

  function pushToGitHub(project: Project, message: string) {
    try {
      const command = `/bin/zsh -ilc "git add . && git commit -m '${message}' && git push"`;
      execSync(command, {
        cwd: project.fullPath,
        shell: "/bin/zsh",
      });

      showToast({
        style: Toast.Style.Success,
        title: "Changes Pushed",
        message: "Successfully pushed to GitHub",
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Push Failed",
        message: `Failed to push: ${(error as Error).message}`,
      });
    }
  }

  async function renameProject(project: Project, newName: string) {
    try {
      const oldPath = project.fullPath;
      const newPath = path.join(path.dirname(oldPath), newName);

      fs.renameSync(oldPath, newPath);

      // Update last opened times
      const lastOpenedTimes = JSON.parse((await LocalStorage.getItem("lastOpenedTimes")) || "{}") as Record<
        string,
        number
      >;
      if (lastOpenedTimes[oldPath]) {
        lastOpenedTimes[newPath] = lastOpenedTimes[oldPath];
        delete lastOpenedTimes[oldPath];
        await LocalStorage.setItem("lastOpenedTimes", JSON.stringify(lastOpenedTimes));
      }

      // Update aliases
      const projectAliases = JSON.parse((await LocalStorage.getItem("project_aliases")) || "{}") as Record<
        string,
        string[]
      >;
      if (projectAliases[oldPath]) {
        projectAliases[newPath] = projectAliases[oldPath];
        delete projectAliases[oldPath];
        await LocalStorage.setItem("project_aliases", JSON.stringify(projectAliases));
      }

      await loadCategoriesAndProjects();

      showToast({
        style: Toast.Style.Success,
        title: "Project Renamed",
        message: `Successfully renamed to ${newName}`,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Rename Failed",
        message: `Failed to rename: ${(error as Error).message}`,
      });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function CommitForm({ project, onSubmit }: { project: Project; onSubmit: (message: string) => void }) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm onSubmit={(values) => onSubmit(values.message)} />
          </ActionPanel>
        }
      >
        <Form.TextField id="message" title="Commit Message" placeholder="Enter your commit message" autoFocus />
      </Form>
    );
  }

  function EditAliasesForm({ project, onSubmit }: { project: Project; onSubmit: (aliases: string[]) => void }) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              onSubmit={(values) => {
                const aliases = values.aliases
                  .split(",")
                  .map((a: string) => a.trim())
                  .filter((a: string) => a);
                onSubmit(aliases);
              }}
            />
          </ActionPanel>
        }
      >
        <Form.TextField
          id="aliases"
          title="Aliases"
          placeholder="Enter aliases separated by commas"
          defaultValue={project.aliases.join(", ")}
          autoFocus
        />
      </Form>
    );
  }

  function DeployToCoolifyForm({ project, onSubmit }: { project: Project; onSubmit: (newName: string) => void }) {
    const [selectedCoolifyProject, setSelectedCoolifyProject] = useState<string | null>("new");
    const [coolifyProjects, setCoolifyProjects] = useState<CoolifyProject[]>([]);
    useEffect(() => {
      getCoolifyProjects().then((projects) => {
        setCoolifyProjects(projects as CoolifyProject[]);
      });
    }, []);
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              onSubmit={(values) => {
                if (selectedCoolifyProject === "new") {
                  createCoolifyProject(values.newName);
                  onSubmit(values.newName);
                } else if (selectedCoolifyProject) {
                  deployToCoolify(project, selectedCoolifyProject);
                }
              }}
            />
          </ActionPanel>
        }
      >
        <Form.Dropdown id="coolifyProject" value={selectedCoolifyProject ?? "new"} onChange={setSelectedCoolifyProject}>
          {coolifyProjects.map((project) => (
            <Form.Dropdown.Item key={project.uuid} title={project.name} value={project.uuid} />
          ))}
        </Form.Dropdown>

        {selectedCoolifyProject === "new" && (
          <Form.TextField
            id="newName"
            title="New Project Name"
            placeholder="Enter new project name"
            defaultValue=""
            autoFocus
          />
        )}
      </Form>
    );
  }

  function EditProjectNameForm({ project, onSubmit }: { project: Project; onSubmit: (newName: string) => void }) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm onSubmit={(values) => onSubmit(values.newName)} />
          </ActionPanel>
        }
      >
        <Form.TextField
          id="newName"
          title="New Project Name"
          placeholder="Enter new project name"
          defaultValue={project.name}
          autoFocus
        />
      </Form>
    );
  }

  async function saveProjectAliases(project: Project, aliases: string[]) {
    try {
      const storedProjects = (await LocalStorage.getItem("project_aliases")) || "{}";
      const projectAliases = JSON.parse(storedProjects as string) as Record<string, string[]>;

      projectAliases[project.fullPath] = aliases;
      await LocalStorage.setItem("project_aliases", JSON.stringify(projectAliases));

      showToast({
        style: Toast.Style.Success,
        title: "Aliases Saved",
        message: "Project aliases have been updated",
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to save aliases",
      });
    }
  }

  function searchFilter(items: ProjectWithLastOpened[], searchText: string): ProjectWithLastOpened[] {
    if (!searchText) return items;

    const lowerSearchText = searchText.toLowerCase();
    return items.filter(
      (project) =>
        project.name.toLowerCase().includes(lowerSearchText) ||
        project.categoryName.toLowerCase().includes(lowerSearchText) ||
        project.aliases.some((alias) => alias.toLowerCase().includes(lowerSearchText)),
    );
  }

  function filterProjectsByCategory(projects: ProjectWithLastOpened[], category: string): ProjectWithLastOpened[] {
    return projects.filter((project) => project.categoryName === category);
  }

  function checkIfCoolifyApp(project: Project): boolean {
    if (hasGitRepository(project)) {
      const remote = getGithubRepoRemote({ project });
      return coolifyApps.some((app) => app.git_repository === remote);
    }
    return false;
  }

  function pullFromGitHub(project: Project) {
    try {
      const command = `/bin/zsh -ilc "git pull"`;
      execSync(command, {
        cwd: project.fullPath,
        shell: "/bin/zsh",
      });

      showToast({
        style: Toast.Style.Animated,
        title: "Pulling Changes",
        message: "Fetching latest changes from GitHub...",
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Pull Failed",
        message: `Failed to pull: ${(error as Error).message}`,
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Category"
          value={selectedCategory || ""}
          onChange={(value) => {
            setSelectedCategory(value);
            setFilteredProjects(filterProjectsByCategory(projects, value));
          }}
        >
          <List.Dropdown.Item title="All Projects" value="" />
          {categories.map((category) => (
            <List.Dropdown.Item
              key={category.name}
              title={category.name}
              value={category.name}
              icon={category.imagePath}
            />
          ))}
        </List.Dropdown>
      }
      onSearchTextChange={(text) => {
        const filtered = searchFilter(
          selectedCategory
            ? filterProjectsByCategory(projects, selectedCategory).filter((p) => p.categoryName === selectedCategory)
            : projects,
          text,
        );
        setFilteredProjects(filtered);
      }}
    >
      {filteredProjects.map((project) => (
        <List.Item
          key={project.categoryName + "_" + project.name}
          title={project.name}
          subtitle={project.categoryName}
          icon={categories.find((c) => c.folderName === project.categoryName)?.imagePath}
          accessories={[
            ...(project.aliases.length > 0 ? [{ text: project.aliases.join(", ") }] : []),
            ...(checkIfCoolifyApp(project) ? [{ tag: { value: "Coolify" } }] : []),
            ...(hasGitRepository(project) ? [{ tag: { value: "GitHub" } }] : []),
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Open Project"
                onAction={() => openProject({ project: project })}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
                icon={Icon.Window}
              />
              {!categories.find((c) => c.name === project.categoryName)?.defaultAppPath.includes("Cursor") && (
                <Action
                  title="Open in Cursor"
                  onAction={() => open(project.fullPath, "/Applications/Cursor.app")}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                  icon={Icon.Code}
                />
              )}

              {hasGitRepository(project) && (
                <>
                  <Action.Push
                    title="Push to GitHub"
                    icon={Icon.Upload}
                    shortcut={{ modifiers: ["cmd"], key: "g" }}
                    target={<CommitForm project={project} onSubmit={(message) => pushToGitHub(project, message)} />}
                  />
                  <Action
                    title="Pull from GitHub"
                    icon={Icon.Download}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
                    onAction={() => pullFromGitHub(project)}
                  />
                </>
              )}
              <Action
                title="Open in Terminal"
                icon={Icon.Terminal}
                onAction={() => open(project.fullPath, "/System/Applications/Utilities/Terminal.app")}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
              />
              <Action
                title="Open in Claude Code"
                icon={Icon.Terminal}
                onAction={() => {
                  execSync(
                    `osascript -e 'tell application "Terminal" to do script "cd \\"${project.fullPath}\\" && vt claude --dangerously-skip-permissions" & activate'`,
                  );
                }}
                shortcut={{ modifiers: ["cmd"], key: "l" }}
              />

              {hasGitRepository(project) && (
                <Action.OpenInBrowser
                  title="Open Repo"
                  url={getGitRepoUrl(project) || ""}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              )}
              {hasGitRepository(project) && (
                <Action
                  title="Delete Repo"
                  style={Action.Style.Destructive}
                  onAction={() => reinitGitRepo(project)}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  icon={Icon.Trash}
                />
              )}
              {!hasGitRepository(project) && (
                <Action
                  title="Create Repo"
                  onAction={() => createGitRepo(project)}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  icon={Icon.Plus}
                />
              )}
              {hasGitRepository(project) && (
                <Action.Push
                  title="Deploy to Coolify"
                  target={<DeployToCoolifyForm project={project} onSubmit={async () => {}} />}
                />
              )}
              <Action.Push
                title="Edit Project Name"
                target={
                  <EditProjectNameForm
                    project={project}
                    onSubmit={async (newName) => {
                      await renameProject(project, newName);
                    }}
                  />
                }
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                icon={Icon.Pencil}
              />
              <Action.Push
                title="Edit Project Settings"
                shortcut={{ modifiers: ["cmd"], key: "s" }}
                icon={Icon.Pencil}
                target={
                  <EditProjectSettingsForm
                    projectSettings={projectSettings.find((p) => p.projectID === project.name) as ProjectSettings}
                  />
                }
              />
              <Action.Push
                title="Edit Aliases"
                target={
                  <EditAliasesForm
                    project={project}
                    onSubmit={async (aliases) => {
                      await saveProjectAliases(project, aliases);
                      loadCategoriesAndProjects();
                    }}
                  />
                }
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                icon={Icon.Pencil}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
