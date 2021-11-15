import { 
  Main, 
  Group,
  ScriptCommand
} from "@models"

import { 
  fetchScriptCommands,
  fetchSourceCode
} from "@network"

import {
  iconDarkURLFor,
  iconLightURLFor,
  IconResult,
  IconStyle,
  IconType,
  sourceCodeRawURL
} from "@urls"

import { 
  environment, 
  getPreferenceValues 
} from "@raycast/api"

import afs from "fs/promises"
import fs from 'fs'
import { homedir } from "os"
import path from "path"

import download from "download"

interface File {
  path: string
  link: string
}

interface Files {
  iconLight: FileNullable
  iconDark: FileNullable
  command: File
}

interface Command {
  identifier: string
  needsSetup: boolean
  files: Files
  scriptCommand: ScriptCommand
}

interface Content {
  [identifier: string]: Command
}

interface Result<T> {
  content: T,
  message: string
}

export enum State {
  Installed,
  NotInstalled,
  NeedSetup,
  Error,
}

enum IconUsage {
  LastScriptUsing,
  BeingUsedByMore,
}

interface IconPath  {
  filename: string, 
  path: string
}

type StateResult = Result<State>

type IconPathNullable = IconPath | null

type IconResultNullable = IconResult | null

type FileNullable = File | null

class ContentManager {
  private content: Content

  getContent = (): Content => this.content

  constructor() {
    this.content = {}
  }

  setContent(content: Content): void {
    this.content = content
  }

  contentFor(identifier: string): Command | null {
    return this.content[identifier]
  }

  add(command: Command): void {
    this.content[command.identifier] = command
  }

  update(command: Command): void {
    this.content[command.identifier] = command
  }

  delete(identifier: string): void {
    if (this.content && this.content[identifier] != null)
      delete this.content[identifier]
  }

  clear(): void {
    this.content = {}
  }
}

export class DataManager {
  private folderPath = getPreferenceValues().folderPath
  private commandsFolderPath = this.resolvePath(this.folderPath)
  private databaseFile = path.join(environment.supportPath, "ScriptCommandsStore.json")
  private repositoryCommandsFolderPath = path.join(this.commandsFolderPath, "commands")
  private imagesCommandsFolderPath = path.join(this.commandsFolderPath, "images")

  private static instance = new DataManager()

  private contentManager: ContentManager

  static shared(): DataManager { 
    return this.instance
  }

  private constructor() {
    this.contentManager = new ContentManager()
    this.setupFolders()
    this.loadDatabase()
  }
  
  private loadDatabase(): void {
    try {
      fs.accessSync(this.databaseFile, fs.constants.R_OK)

      if (fs.existsSync(this.databaseFile)) {
        const data = fs.readFileSync(this.databaseFile).toString()
        
        if (data.length > 0) {
          const content: Content = JSON.parse(data)
          this.contentManager.setContent(content)
        }
      }
    }
    catch (error) {
      this.persist()
    }
  }

  private setupFolders(): void {
    const paths = [
      environment.supportPath,
      this.repositoryCommandsFolderPath,
      this.imagesCommandsFolderPath
    ]

    paths.forEach((path) => {
      fs.mkdirSync(
        path, 
        { recursive: true }
      )  
    })
  }
  
  isCommandDownloaded(identifier: string): boolean {
    const command = this.contentManager.contentFor(identifier)
    return command != null
  }

  isCommandNeedsSetup(identifier: string): boolean {
    const command = this.contentManager.contentFor(identifier)

    if (command != null)
      return command.needsSetup

    return true
  }

  private resolvePath(folder: string): string {
    if (folder.length > 0 && folder.startsWith("~"))
      return path.join(homedir(), folder.slice(1))
  
    return folder
  }

  persist(): void {
    const data = JSON.stringify(this.contentManager.getContent(), null, 2)

    if ((data != null || data != undefined) && data.length > 0)
      fs.writeFileSync(this.databaseFile, data)
  }

  clear(): void {
    this.contentManager.clear()
    this.persist()
  }

  stateFor(scriptCommand: ScriptCommand): State {
    const downloaded = this.isCommandDownloaded(scriptCommand.identifier)
    const needSetup = this.isCommandNeedsSetup(scriptCommand.identifier)

    let state: State

    if (downloaded) {
      if (needSetup)
        state = State.NeedSetup
      else
        state = State.Installed
    }
    else
      state = State.NotInstalled

    return state
  }

  async fetchCommands(): Promise<Main> {
    return fetchScriptCommands()
  }

  async fetchSourceCode(scriptCommand: ScriptCommand): Promise<string> {
    return fetchSourceCode(scriptCommand)
  }

  async fetchInstalledCommands(): Promise<Main> {
    this.loadDatabase()

    const content = this.contentManager.getContent()
    
    const main: Main = {
      groups: [],
      totalScriptCommands: Object.values(content).length
    }

    const installedGroup: Group = {
      name: "Installed Script Commands",
      path: "installed-script-commands",
      scriptCommands: []
    }

    Object.values(content).forEach((command: Command) => {
      installedGroup.scriptCommands.push(command.scriptCommand)
    })

    installedGroup.scriptCommands.sort((left: ScriptCommand, right: ScriptCommand) => {
      return (left.title > right.title) ? 1 : -1
    })

    main.groups.push(installedGroup)

    return main
  }
  
  async download(scriptCommand: ScriptCommand): Promise<StateResult> {
    const commandFullPath = path.join(this.repositoryCommandsFolderPath, scriptCommand.path)
  
    const icons = await this.downloadIcons(
      scriptCommand, 
      commandFullPath
    )

    const command = await this.downloadCommand(
      scriptCommand,
      commandFullPath
    )

    if (command == null)
      return {
        content: State.Error,
        message: "Script Command couldn't be downloaded"  
      }

    const files: Files = {
      command: command,
      iconDark: null,
      iconLight: null
    }

    if (icons.light != null)
      files.iconLight = icons.light

    if (icons.dark != null)
      files.iconDark = icons.dark
    
    const resource: Command = {
      identifier: scriptCommand.identifier,
      needsSetup: scriptCommand.isTemplate,
      files: files,
      scriptCommand: scriptCommand
    }

    this.contentManager.add(resource)
    this.persist()

    return {
      content: scriptCommand.isTemplate ? State.NeedSetup : State.Installed,
      message: ""
    }
  }

  private iconPaths(icon?: string | null): IconPathNullable {
    if (icon == null || icon == undefined )
      return null

    let imagePath = ""
    let filename = ""

    if (icon.length > 0) {
      const fullpath = path.parse(icon)

      filename = fullpath.base
      imagePath = fullpath.dir
    }

    return {
      filename: filename,
      path: imagePath
    }
  }

  private async downloadIcons(scriptCommand: ScriptCommand, commandPath: string): Promise<{ dark: FileNullable, light: FileNullable }> {
    const icons: { dark: FileNullable, light: FileNullable } = { 
      dark: null, 
      light: null 
    }
    
    if (scriptCommand.icon == null) 
      return icons

    let imagePath = ""
    const icon = scriptCommand.icon

    const lightIcon = this.iconPaths(icon.light)
    const darkIcon = this.iconPaths(icon.dark)

    if (lightIcon != null && lightIcon.path.length > 0)
      imagePath = lightIcon.path
    else if (darkIcon != null && darkIcon.path.length > 0)
      imagePath = darkIcon.path

    if (imagePath.length == 0)
      return icons

    const imageFolderPath = path.join(commandPath, imagePath)
      
    if (fs.existsSync(imageFolderPath) == false)
      afs.mkdir(imageFolderPath, { recursive: true })

    icons.light = await this.downloadIconFor(scriptCommand, lightIcon, imageFolderPath, IconStyle.Light)
    icons.dark = await this.downloadIconFor(scriptCommand, darkIcon, imageFolderPath, IconStyle.Dark)

    return icons
  }

  private async downloadIconFor(
    scriptCommand: ScriptCommand, 
    iconPath: IconPathNullable, 
    imageFolderPath: string, 
    style: IconStyle
  ): Promise<FileNullable> {
    if (iconPath == null)
      return null
    
    if (iconPath.filename.length == 0)
      return null

    let resource: IconResultNullable = null

    if (style == IconStyle.Light)
      resource = iconLightURLFor(scriptCommand)
    else
      resource = iconDarkURLFor(scriptCommand)

    if (resource != null && resource.type == IconType.URL) {
      const result = await this.downloadIcon(
        resource.content,
        imageFolderPath,
        iconPath.filename
      )

      return result
    }

    return null
  }

  private async downloadIcon(
    url: string, 
    imageFolderPath: string, 
    filename: string
  ): Promise<File | null> {
    const imagePath = path.join(imageFolderPath, filename)
    const linkImagePath = path.join(this.imagesCommandsFolderPath, filename)

    if (fs.existsSync(imagePath) == false) {
      await download(
        url, 
        imageFolderPath, 
        { filename: filename }
      )

      if (fs.existsSync(this.imagesCommandsFolderPath) == false) {
        fs.mkdirSync(
          this.imagesCommandsFolderPath, 
          {recursive: true}
        )
      }      
    }

    if (fs.existsSync(linkImagePath) == false) {
      await afs.symlink(
        imagePath, 
        linkImagePath
      )
    }

    if (fs.existsSync(linkImagePath) == false)
      return null
    
    return {
      path: imagePath,
      link: linkImagePath
    }
  }

  private async downloadCommand(scriptCommand: ScriptCommand, commandPath: string): Promise<FileNullable> {
    const filename = scriptCommand.filename
    const commandFilePath = path.join(commandPath, scriptCommand.filename)

    const linkFilename = scriptCommand.isTemplate ? `${scriptCommand.identifier}.template` : scriptCommand.identifier
    const linkCommandFilePath = path.join(this.commandsFolderPath, linkFilename)

    if (fs.existsSync(commandFilePath) == false) {
      await download(
        sourceCodeRawURL(scriptCommand), 
        commandPath,
        { filename: filename }
      )
    }

    if (fs.existsSync(linkCommandFilePath) == false) {
      await afs.symlink(
        commandFilePath,
        linkCommandFilePath
      )
    }

    if (fs.existsSync(linkCommandFilePath) == false)
      return null

    return {
      path: commandFilePath,
      link: linkCommandFilePath
    }
  }

  async uninstall(scriptCommand: ScriptCommand): Promise<StateResult> {
    const content = this.contentManager.contentFor(scriptCommand.identifier)
 
    if (content != null) {
      const files = content.files

      let filesDeleted = 0

      if (this.deleteIcon(files.iconLight, IconStyle.Light))
        filesDeleted += 0.5

      if (this.deleteIcon(files.iconDark, IconStyle.Dark))
        filesDeleted += 0.5

      if (this.deleteCommand(files.command))
        filesDeleted += 1
  
      if (filesDeleted >= 1) {
        this.contentManager.delete(scriptCommand.identifier)
        this.persist()

        return {
          content: State.NotInstalled,
          message: ""
        }
      }
    }

    return {
      content: State.Error,
      message: "Something went wrong"
    }
  }

  private deleteCommand(file: FileNullable): boolean {
    if (file == null)
      return false

    if (file.path.length > 0 && file.link.length > 0) {
      if (fs.existsSync(file.path) && fs.existsSync(file.link)) {
        afs.rm(file.link)
        afs.rm(file.path)

        return true
      }
    }

    return false
  }  

  private deleteIcon(file: FileNullable, style: IconStyle): boolean {
    if (file == null)
      return false

    if (file.path.length > 0 && file.link.length > 0) {
      const linkPath = path.parse(file.link)

      if (this.iconUsage(linkPath.name, style) == IconUsage.LastScriptUsing) {
        afs.rm(file.link)
        afs.rm(file.path)

        return true
      }
    }

    return false
  }

  private iconUsage(filename: string, style: IconStyle): IconUsage {
    let counter = 0

    const content = this.contentManager.getContent()

    Object.values(content).forEach((command: Command) => {
      const files = command.files
      
      let file: FileNullable

      if (style == IconStyle.Light)
        file = files.iconLight
      else
        file = files.iconDark

      if (file != null && file.link.length > 0) {
        const parsedpath = path.parse(file.link)

        if (parsedpath.name == filename && fs.existsSync(file.link))
          counter += 1
      }
    })

    if (counter >= 2)
      return IconUsage.BeingUsedByMore
    else
      return IconUsage.LastScriptUsing
  }
}