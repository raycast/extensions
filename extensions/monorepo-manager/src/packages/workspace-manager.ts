import { Configuration, Project, Workspace, type Locator, structUtils } from '@yarnpkg/core';
import { npath, type PortablePath } from '@yarnpkg/fslib';
import { getConfigs } from '../utils/config';

export interface WorkspaceManagerOptions {
  workspaceRoot: string;
  projectCwd: PortablePath;
  project: Project;
  workspace: Workspace;
}

export class WorkspaceManager {
  public readonly $cwd: PortablePath;
  public readonly project: Project;
  public readonly workspace: Workspace;
  public readonly workspaceRoot: string;
  public readonly mainFieldName: string | undefined;

  constructor({ projectCwd, workspace, workspaceRoot, project }: WorkspaceManagerOptions) {
    this.$cwd = projectCwd;
    this.project = project;
    this.workspace = workspace;
    this.workspaceRoot = workspaceRoot;
  }

  /** Get the name for the root workspace */
  get rootWorkspaceName() {
    return WorkspaceManager.getWorkspaceName(this.workspace);
  }

  static async initialize(workspaceRoot: string) {
    const $cwd = npath.toPortablePath(workspaceRoot);

    const configuration = await Configuration.find($cwd, null, { strict: false });
    const wsProject = await Project.find(configuration, $cwd);

    const { workspace, project } = wsProject;

    if (workspace === null) {
      throw new Error(`Error initializing workspace with path \`${workspaceRoot}\`, workspace not defined`);
    }

    return new WorkspaceManager({
      projectCwd: $cwd,
      workspaceRoot,
      workspace,
      project,
    });
  }

  /** Get the name for a given workspace */
  static getWorkspaceName(workspace: Workspace): string | null {
    if (!workspace.manifest.name) {
      console.error('Could not determine workspace name');
      return null;
    }

    return structUtils.stringifyIdent(workspace.manifest.name);
  }

  static getWorkspaceScope(workspace: Workspace): string | null {
    if (!workspace.manifest.name) {
      console.error('Could not determine workspace name');
      return null;
    }

    return workspace.manifest.name.scope;
  }

  static getWorkspaceTeam(workspace: Workspace): string {
    const mainFieldName = getConfigs().mainFieldName;

    if (mainFieldName) {
      return workspace.manifest.raw[mainFieldName]?.team || '';
    }

    return '';
  }

  static getWorkspaceVersion(workspace: Workspace): string {
    return workspace.manifest?.version || '';
  }

  static getWorkspaceDesc(workspace: Workspace): string {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore ignore checking this
    return workspace.manifest?.description || '';
  }

  /** Returns package-specific Slack channel from the package.json, if it exists */
  static getWorkspaceSlack(workspace: Workspace): string {
    const mainFieldName = getConfigs().mainFieldName;

    if (mainFieldName) {
      return workspace.manifest.raw[mainFieldName]?.slack?.channel;
    }

    return '';
  }

  public getWorkspacePackages(): Workspace[] {
    return this.project.workspaces
      .filter((ws): ws is Workspace => Boolean(WorkspaceManager.getWorkspaceName(ws)))
      .sort((a, b) => {
        const nameA = WorkspaceManager.getWorkspaceName(a);
        const nameB = WorkspaceManager.getWorkspaceName(b);

        if (nameA && nameB) {
          return nameA.localeCompare(nameB);
        }

        return 0;
      });
  }
}
