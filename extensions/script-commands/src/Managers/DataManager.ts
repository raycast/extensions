import { 
  Main, 
  ScriptCommand 
} from "@models"

import { 
  fetchScriptCommands,
  fetchSourceCode
} from "@network"

import {
  iconDarkURL,
  iconLightURL,
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
  iconLight: File | null
  iconDark: File | null
  command: File
}

interface Command {
  identifier: string
  needsSetup: boolean
  files: Files
  scriptCommand: ScriptCommand
}

interface Result<T> {
  content: T,
  message: string
}

type StateResult = Result<State>

export enum State {
  Installed,
  NotInstalled,
  NeedSetup,
  Error,
}

interface Content {
  [identifier: string]: Command
}
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
  
  private isCommandDownloaded(identifier: string): boolean {
    const command = this.contentManager.contentFor(identifier)
    return command != null
  }

  private isCommandNeedsSetup(identifier: string): boolean {
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

  iconPaths(icon?: string): [string, string] {
    let imagePath = ""
    let filename = ""

    if (icon != null && icon.length > 0) {
      const fullpath = path.parse(icon)

      filename = fullpath.base
      imagePath = fullpath.dir
    }

    return [
      filename,
      imagePath
    ]
  }

  async downloadIcons(scriptCommand: ScriptCommand, commandPath: string): Promise<{ dark: File | null, light: File | null }> {
    const icons: { dark: File | null, light: File | null } = { 
      dark: null, 
      light: null 
    }
    
    if (scriptCommand.icon == null) 
      return icons

    let imagePath = ""
    const icon = scriptCommand.icon
    const [lightFilename, lightImagePath] = this.iconPaths(icon.light)
    const [darkFilename, darkImagePath] = this.iconPaths(icon.dark)
    
    if (lightImagePath.length > 0)
      imagePath = lightImagePath
    else if (darkImagePath.length > 0)
      imagePath = darkImagePath

    if (imagePath.length == 0)
      return icons

    const imageFolderPath = path.join(commandPath, imagePath)
      
    if (fs.existsSync(imageFolderPath) == false)
      afs.mkdir(imageFolderPath, { recursive: true })

    if (lightFilename.length > 0) {
      const lightIcon = await this.downloadIcon(
        iconLightURL(scriptCommand) ?? "",
        imageFolderPath,
        lightFilename
      )

      if (lightIcon != null)
        icons.light = lightIcon
    }

    if (darkFilename.length > 0) {
      const darkIcon = await this.downloadIcon(
        iconDarkURL(scriptCommand) ?? "",
        imageFolderPath,
        darkFilename
      )

      if (darkIcon != null)
        icons.dark = darkIcon
    }

    return icons
  }

  async downloadIcon(
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

  async downloadCommand(scriptCommand: ScriptCommand, commandPath: string): Promise<File | null> {
    const filename = scriptCommand.filename
    const commandFilePath = path.join(commandPath, scriptCommand.filename)

    const linkFilename = scriptCommand.isTemplate ? `${scriptCommand.identifier}.template` : filename
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
}
