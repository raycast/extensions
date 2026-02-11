import { CompactGroup, Language, MainCompactGroup, ScriptCommand } from "@models";

import { fetchReadme, fetchScriptCommands, fetchSourceCode } from "@network";

import { ContentStore } from "@stores";

import { ScriptCommandManager, Settings } from "@managers";

import { Content, FileNullable, Filter, Process, Progress, State, StateResult } from "@types";

import { constants, accessSync, existsSync, mkdirSync, readFileSync, writeFileSync, watch, FSWatcher } from "fs";

export class DataManager {
  private static instance = new DataManager();

  private contentManager: ContentStore;
  private scriptCommandManager: ScriptCommandManager;
  private settings = new Settings();
  private mainContent: MainCompactGroup;

  static shared(): DataManager {
    return this.instance;
  }

  private constructor() {
    this.contentManager = new ContentStore();

    this.scriptCommandManager = new ScriptCommandManager(this.contentManager, this.settings);

    this.mainContent = {
      groups: [],
      languages: [],
      totalScriptCommands: 0,
    };

    this.setupFolders();
    this.loadDatabase();
  }

  private loadDatabase(): void {
    try {
      accessSync(this.settings.databaseFile, constants.R_OK);

      if (existsSync(this.settings.databaseFile)) {
        const data = readFileSync(this.settings.databaseFile).toString();

        if (data.length > 0) {
          const content: Content = JSON.parse(data);
          this.contentManager.setContent(content);
        }
      }
    } catch (error) {
      this.persist();
    }
  }

  private setupFolders(): void {
    const paths = [
      this.settings.supportPath,
      this.settings.repositoryCommandsFolderPath,
      this.settings.imagesCommandsFolderPath,
    ];

    paths.forEach((path) => {
      mkdirSync(path, { recursive: true });
    });
  }

  persist(): void {
    const data = JSON.stringify(this.contentManager.getContent(), null, 2);

    if (data && data.length > 0) {
      writeFileSync(this.settings.databaseFile, data);
    }
  }

  clear(): void {
    this.contentManager.clear();
    this.persist();
  }

  private hashFromFile(path: string): string {
    return this.scriptCommandManager.hashFromFile(path);
  }

  private isCommandDownloaded(identifier: string): boolean {
    const command = this.contentManager.contentFor(identifier);
    return command != null;
  }

  private isCommandChanged(identifier: string): boolean {
    const command = this.contentManager.contentFor(identifier);

    if (!command) {
      return false;
    }

    const commandPath = command.files.command.path;
    const commandHash = command.sha;
    const currentFileHash = this.hashFromFile(commandPath);

    return commandHash != currentFileHash;
  }

  private commandNeedsSetup(identifier: string): boolean {
    const command = this.contentManager.contentFor(identifier);

    if (command) {
      return command.needsSetup;
    }

    return true;
  }

  monitorChangesFor(identifier: string, callback: (state: State) => void): FSWatcher | null {
    const file = this.commandFileFor(identifier);
    const state = this.stateFor(identifier);

    if (file && state === State.NeedSetup) {
      return watch(file.path, (event) => {
        if (!this.isCommandChanged(identifier)) {
          callback(State.NeedSetup);
          return;
        }

        if (event == "change") {
          callback(this.stateFor(identifier));
        }
      });
    }

    return null;
  }

  updateHashOnChangeFor(identifier: string, onChange: () => void): FSWatcher | null {
    const file = this.commandFileFor(identifier);
    const state = this.stateFor(identifier);

    if (file && state == State.Installed) {
      return watch(file.path, (event) => {
        if (event === "change" && this.isCommandChanged(identifier)) {
          this.scriptCommandManager.updateHashFor(identifier);
          this.persist();

          onChange();
        }
      });
    }

    return null;
  }

  commandFileFor(identifier: string): FileNullable {
    const command = this.contentManager.contentFor(identifier);

    if (!command) {
      return null;
    }

    return command.files.command;
  }

  stateFor(identifier: string): State {
    const downloaded = this.isCommandDownloaded(identifier);
    const needSetup = this.commandNeedsSetup(identifier);
    const changedContent = this.isCommandChanged(identifier);

    let state: State = State.NotInstalled;

    if (downloaded) {
      state = State.Installed;

      if (changedContent && needSetup) {
        state = State.ChangesDetected;
      } else if (needSetup) {
        state = State.NeedSetup;
      }
    }

    return state;
  }

  fetchLanguages(): Language[] {
    return this.mainContent.languages;
  }

  async fetchCommands(filter: Filter = null): Promise<MainCompactGroup> {
    if (filter != null) {
      return this.filterCommands(filter);
    }

    if (this.mainContent.groups.length > 0) {
      return this.mainContent;
    }

    this.mainContent = await fetchScriptCommands();

    return this.mainContent;
  }

  private filterCommands(filter: Filter): MainCompactGroup {
    let data = { ...this.mainContent };
    data.totalScriptCommands = 0;

    if (filter == null) {
      return data;
    }

    if (typeof filter === "string") {
      const groups: CompactGroup[] = [];

      data.groups.forEach((group) => {
        const groupCopy = { ...group };
        groupCopy.scriptCommands = [];

        group.scriptCommands.forEach((scriptCommand) => {
          if (scriptCommand.language == filter) {
            groupCopy.scriptCommands.push(scriptCommand);
          }
        });

        if (groupCopy.scriptCommands.length > 0) {
          groupCopy.scriptCommands.sort((left: ScriptCommand, right: ScriptCommand) =>
            left.title > right.title ? 1 : -1,
          );

          data.totalScriptCommands += groupCopy.scriptCommands.length;
          groups.push(groupCopy);
        }
      });

      groups.sort((left: CompactGroup, right: CompactGroup) => (left.title > right.title ? 1 : -1));

      data.groups = groups;
    } else {
      const content = this.contentManager.getContent();

      const group: CompactGroup = {
        identifier: "installed-script-commands",
        title: "Installed",
        subtitle: "Script Commands",
        scriptCommands: [],
      };

      Object.values(content).forEach((item) => {
        if ((filter === State.NeedSetup && item.needsSetup === true) || filter === State.Installed) {
          group.scriptCommands.push(item.scriptCommand);
        }
      });

      group.scriptCommands.sort((left: ScriptCommand, right: ScriptCommand) => {
        if (left.packageName && right.packageName) {
          return left.packageName > right.packageName ? 1 : -1;
        }

        return 0;
      });

      data = {
        groups: [group],
        totalScriptCommands: group.scriptCommands.length,
        languages: [],
      };
    }

    return data;
  }

  async fetchSourceCode(scriptCommand: ScriptCommand, signal: AbortSignal): Promise<string> {
    return fetchSourceCode(scriptCommand, signal);
  }

  async fetchReadme(path: string, signal: AbortSignal): Promise<string> {
    return fetchReadme(path, signal);
  }

  async installScriptCommand(scriptCommand: ScriptCommand): Promise<StateResult> {
    const result = await this.scriptCommandManager.install(scriptCommand);

    if (result.content === State.Installed || result.content === State.NeedSetup) {
      this.persist();
    }

    return result;
  }

  async installPackage(group: CompactGroup, callback: (process: Process) => void): Promise<Progress> {
    let progress = Progress.InProgress;
    let currentInstall = 1;

    const scriptCommands: ScriptCommand[] = [];

    group.scriptCommands.forEach((scriptCommand) => {
      const state = this.stateFor(scriptCommand.identifier);

      if (state == State.NotInstalled) {
        scriptCommands.push(scriptCommand);
      }
    });

    await asyncForLoop(scriptCommands, async (scriptCommand) => {
      let process: Process = {
        identifier: scriptCommand.identifier,
        progress: Progress.InProgress,
        current: currentInstall,
        state: State.NotInstalled,
        total: scriptCommands.length,
      };

      callback(process);

      const result = await this.installScriptCommand(scriptCommand);

      process = {
        ...process,
        state: result.content,
        progress: Progress.Finished,
      };

      callback(process);

      if (currentInstall == process.total) {
        progress = process.progress;
      }

      currentInstall += 1;
    });

    return progress;
  }

  async deleteScriptCommand(scriptCommand: ScriptCommand): Promise<StateResult> {
    const result = await this.scriptCommandManager.delete(scriptCommand);

    if (result.content === State.NotInstalled) {
      this.persist();
    }

    return result;
  }

  async confirmScriptCommandSetupFor(scriptCommand: ScriptCommand): Promise<StateResult> {
    const result = this.scriptCommandManager.finishSetup(scriptCommand);

    if (result.content === State.Installed) {
      this.persist();
    }

    return result;
  }
}

type AsyncForLoop<T> = (items: T[], callback: (item: T) => Promise<void>) => Promise<void>;

type AsyncLoopCommand = AsyncForLoop<ScriptCommand>;

const asyncForLoop: AsyncLoopCommand = async (items, callback) => {
  for (const scriptCommand of items) {
    await callback(scriptCommand);
  }
};
