import { Settings } from "@managers";

import {
  Command,
  File,
  FileNullable,
  Files,
  IconPathNullable,
  IconResultNullable,
  IconUsage,
  State,
  StateResult,
} from "@types";

import { ScriptCommand } from "@models";

import { ContentStore } from "@stores";

import { iconDarkURLFor, iconLightURLFor, IconStyle, IconType, sourceCodeRawURL } from "@urls";

import path from "path";

import download from "download";

import afs from "fs/promises";

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, renameSync } from "fs";

import { createHash } from "crypto";

export class ScriptCommandManager {
  private contentStore: ContentStore;
  private settings: Settings;

  constructor(contentStore: ContentStore, settings: Settings) {
    this.contentStore = contentStore;
    this.settings = settings;
  }

  hashFromFile(path: string): string {
    if (!existsSync(path)) {
      return "";
    }

    const hash = createHash("sha256");
    const buffer = readFileSync(path);

    hash.update(buffer);

    return hash.digest("hex");
  }

  async install(scriptCommand: ScriptCommand): Promise<StateResult> {
    const commandFullPath = path.join(this.settings.repositoryCommandsFolderPath, scriptCommand.path);

    const icons = await this.downloadIcons(scriptCommand, commandFullPath);

    const command = await this.downloadCommand(scriptCommand, commandFullPath);

    if (!command) {
      return {
        content: State.Error,
        message: "Script Command couldn't be downloaded",
      };
    }

    const files: Files = {
      command: command,
      iconDark: null,
      iconLight: null,
    };

    if (icons.light) {
      files.iconLight = icons.light;
    }

    if (icons.dark) {
      files.iconDark = icons.dark;
    }

    const hash = this.hashFromFile(command.path);

    const resource: Command = {
      identifier: scriptCommand.identifier,
      needsSetup: scriptCommand.isTemplate,
      sha: hash,
      files: files,
      scriptCommand: scriptCommand,
    };

    this.contentStore.add(resource);

    return {
      content: scriptCommand.isTemplate ? State.NeedSetup : State.Installed,
      message: "",
    };
  }

  async delete(scriptCommand: ScriptCommand): Promise<StateResult> {
    const content = this.contentStore.contentFor(scriptCommand.identifier);

    if (content) {
      const files = content.files;

      let filesDeleted = 0;

      if (this.deleteIcon(files.iconLight, IconStyle.Light)) {
        filesDeleted += 0.5;
      }

      if (this.deleteIcon(files.iconDark, IconStyle.Dark)) {
        filesDeleted += 0.5;
      }

      if (this.deleteCommand(files.command)) {
        filesDeleted += 1;
      }

      if (filesDeleted >= 1) {
        this.contentStore.delete(scriptCommand.identifier);

        return {
          content: State.NotInstalled,
          message: "",
        };
      }
    }

    return {
      content: State.Error,
      message: "Something went wrong",
    };
  }

  finishSetup(scriptCommand: ScriptCommand): StateResult {
    const content = this.contentStore.contentFor(scriptCommand.identifier);

    if (content) {
      const files = content.files;
      const command = files.command;

      if (existsSync(command.link)) {
        const link = path.parse(command.link);
        const linkPath = path.join(link.dir, link.name);

        renameSync(command.link, linkPath);

        command.link = linkPath;
        files.command = command;

        content.files = files;
        content.needsSetup = false;
        content.sha = this.hashFromFile(command.path);

        this.contentStore.update(content);

        return {
          content: State.Installed,
          message: "",
        };
      }
    }

    return {
      content: State.Error,
      message: "Something went wrong to confirm the setup for the Script Command",
    };
  }

  updateHashFor(identifier: string) {
    const content = this.contentStore.contentFor(identifier);

    if (!content) {
      return;
    }

    const files = content.files;
    const command = files.command;

    if (existsSync(command.path)) {
      const newHash = this.hashFromFile(command.path);
      content.sha = newHash;

      this.contentStore.update(content);
    }
  }

  private iconPaths(icon?: string | null): IconPathNullable {
    if (!icon) {
      return null;
    }

    let imagePath = "";
    let filename = "";

    if (icon.length > 0) {
      const fullpath = path.parse(icon);

      filename = fullpath.base;
      imagePath = fullpath.dir;
    }

    return {
      filename: filename,
      path: imagePath,
    };
  }

  private async downloadIcons(
    scriptCommand: ScriptCommand,
    commandPath: string,
  ): Promise<{ dark: FileNullable; light: FileNullable }> {
    const icons: { dark: FileNullable; light: FileNullable } = {
      dark: null,
      light: null,
    };

    if (!scriptCommand.icon) {
      return icons;
    }

    let imagePath = "";
    const icon = scriptCommand.icon;

    const lightIcon = this.iconPaths(icon.light);
    const darkIcon = this.iconPaths(icon.dark);

    if (lightIcon && lightIcon.path.length > 0) {
      imagePath = lightIcon.path;
    } else if (darkIcon && darkIcon.path.length > 0) {
      imagePath = darkIcon.path;
    }

    if (imagePath.length == 0) {
      return icons;
    }

    const imageFolderPath = path.join(commandPath, imagePath);

    if (!existsSync(imageFolderPath)) {
      afs.mkdir(imageFolderPath, { recursive: true });
    }

    icons.light = await this.downloadIconFor(scriptCommand, lightIcon, imageFolderPath, IconStyle.Light);
    icons.dark = await this.downloadIconFor(scriptCommand, darkIcon, imageFolderPath, IconStyle.Dark);

    return icons;
  }

  private async downloadIconFor(
    scriptCommand: ScriptCommand,
    iconPath: IconPathNullable,
    imageFolderPath: string,
    style: IconStyle,
  ): Promise<FileNullable> {
    if (!iconPath) {
      return null;
    }

    if (iconPath.filename.length == 0) {
      return null;
    }

    let resource: IconResultNullable = null;
    resource = style == IconStyle.Light ? iconLightURLFor(scriptCommand) : iconDarkURLFor(scriptCommand);

    if (resource && resource.type == IconType.URL) {
      const result = await this.downloadIcon(resource.content, imageFolderPath, iconPath.filename);

      return result;
    }

    return null;
  }

  private async downloadIcon(url: string, imageFolderPath: string, filename: string): Promise<File | null> {
    const imagePath = path.join(imageFolderPath, filename);
    const linkImagePath = path.join(this.settings.imagesCommandsFolderPath, filename);

    if (!existsSync(imagePath)) {
      await download(url, imageFolderPath, { filename: filename });

      if (!existsSync(this.settings.imagesCommandsFolderPath)) {
        mkdirSync(this.settings.imagesCommandsFolderPath, { recursive: true });
      }
    }

    if (!existsSync(linkImagePath)) {
      await afs.symlink(imagePath, linkImagePath);
    }

    if (!existsSync(linkImagePath)) return null;

    return {
      path: imagePath,
      link: linkImagePath,
    };
  }

  private async downloadCommand(scriptCommand: ScriptCommand, commandPath: string): Promise<FileNullable> {
    const filename = scriptCommand.filename;
    const commandFilePath = path.join(commandPath, scriptCommand.filename);

    const linkFilename = scriptCommand.isTemplate ? `${scriptCommand.identifier}.template` : scriptCommand.identifier;
    const linkCommandFilePath = path.join(this.settings.commandsFolderPath, linkFilename);

    if (!existsSync(commandFilePath)) {
      await download(sourceCodeRawURL(scriptCommand), commandPath, { filename: filename });
    }

    if (!existsSync(linkCommandFilePath)) {
      await afs.symlink(commandFilePath, linkCommandFilePath);
    }

    if (!existsSync(linkCommandFilePath)) {
      return null;
    }

    return {
      path: commandFilePath,
      link: linkCommandFilePath,
    };
  }

  private deleteCommand(file: FileNullable): boolean {
    if (file && file.path.length > 0 && file.link.length > 0) {
      if (existsSync(file.path) && existsSync(file.link)) {
        this.deleteFile(file);

        return true;
      }
    }

    return false;
  }

  private deleteIcon(file: FileNullable, style: IconStyle): boolean {
    if (file && file.path.length > 0 && file.link.length > 0) {
      const linkPath = path.parse(file.link);

      if (this.iconUsage(linkPath.name, style) == IconUsage.LastScriptUsing) {
        this.deleteFile(file);

        return true;
      }
    }

    return false;
  }

  private deleteFile(file: File): void {
    rmSync(file.link);
    rmSync(file.path);

    const filePath = path.parse(file.path);
    const files = readdirSync(filePath.dir);
    const dsStore = ".DS_Store";

    if (files.length === 0) {
      rmSync(filePath.dir, { recursive: true, force: true });
    } else if (files.length === 1 && files[0] === dsStore) {
      const dsStorePath = path.join(filePath.dir, dsStore);
      rmSync(dsStorePath);
      rmSync(filePath.dir, { recursive: true, force: true });
    }

    // After delete all the files in the groups, we are checking if the first
    // level group above is also clear, if yes, we delete also that folder
    const list = filePath.dir.split("/");
    list.pop();

    if (list) {
      const groupPath = list.join("/");
      const groupFiles = readdirSync(groupPath);

      if (groupFiles.length === 1 && groupFiles[0] === dsStore) {
        const dsStorePath = path.join(groupPath, dsStore);
        rmSync(dsStorePath);
        rmSync(groupPath, { recursive: true, force: true });
      }
    }
  }

  private iconUsage(filename: string, style: IconStyle): IconUsage {
    let counter = 0;

    const content = this.contentStore.getContent();

    Object.values(content).forEach((command: Command) => {
      const files = command.files;

      const file = style == IconStyle.Light ? files.iconLight : files.iconDark;

      if (file && file.link.length > 0) {
        const parsedpath = path.parse(file.link);

        if (parsedpath.name == filename && existsSync(file.link)) {
          counter += 1;
        }
      }
    });

    if (counter >= 2) {
      return IconUsage.BeingUsedByMore;
    }

    return IconUsage.LastScriptUsing;
  }
}
