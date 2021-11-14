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

interface SystemInformation {
  needsSetup: boolean
}

interface Command {
  identifier: string
  information: SystemInformation
  scriptCommand: ScriptCommand
}

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

  delete(identifier: string): void {
    if (this.content && this.content[identifier] != null)
      delete this.content[identifier]
  }

  clear(): void {
    this.content = {}
  }
}

export class DataManager {
  private commandsFolderPath = this.resolvePath(getPreferenceValues().folderPath)
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

  private resolvePath(folder: string): string {
    if (folder.length > 0 && folder.startsWith("~"))
      return path.join(homedir(), folder.slice(1))
  
    return folder
  }

  persist(): void {
    const data = JSON.stringify(this.contentManager.getContent, null, 2)
    if (data.length > 0)
      fs.writeFileSync(this.databaseFile, data)
  }

  clear(): void {
    this.contentManager.clear()
    this.persist()
  }

  async fetchCommands(): Promise<Main> {
    return fetchScriptCommands()
  }

  async fetchSourceCode(scriptCommand: ScriptCommand): Promise<string> {
    return fetchSourceCode(scriptCommand)
  }
  
  async download(scriptCommand: ScriptCommand) {
    try {
      const commandFullPath = path.join(this.repositoryCommandsFolderPath, scriptCommand.path)
    
      await this.downloadIcons(
        scriptCommand, 
        commandFullPath
      )

      await this.downloadCommand(
        scriptCommand,
        commandFullPath
      )
    }
    catch (error) {
      console.log(error)
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

  async downloadIcon(
    url: string, 
    imageFolderPath: string, 
    filename: string
  ) {
    const imagePath = path.join(imageFolderPath, filename)
    const linkImagePath = path.join(this.imagesCommandsFolderPath, filename)

    if (fs.existsSync(imagePath) == false) {
      try {
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
      catch (error) {
        console.log(`Error: ${error}`)
      }
    }

    if (fs.existsSync(linkImagePath) == false && fs.existsSync(imagePath)) {
      await afs.symlink(
        imagePath, 
        linkImagePath
      )
    }
  }

  async downloadIcons(scriptCommand: ScriptCommand, commandPath: string) {
    if (scriptCommand.icon == null) 
      return

    let imagePath = ""
    const icon = scriptCommand.icon
    const [lightFilename, lightImagePath] = this.iconPaths(icon.light)
    const [darkFilename, darkImagePath] = this.iconPaths(icon.dark)
    
    if (lightImagePath.length > 0)
      imagePath = lightImagePath
    else if (darkImagePath.length > 0)
      imagePath = darkImagePath

    if (imagePath.length == 0)
      return

    const imageFolderPath = path.join(commandPath, imagePath)
      
    if (fs.existsSync(imageFolderPath) == false)
      afs.mkdir(imageFolderPath, { recursive: true })

    if (lightFilename.length > 0) {
      await this.downloadIcon(
        iconLightURL(scriptCommand) ?? "",
        imageFolderPath,
        lightFilename
      )
    }

    if (darkFilename.length > 0) {
      await this.downloadIcon(
        iconDarkURL(scriptCommand) ?? "",
        imageFolderPath,
        darkFilename
      )
    }
  }

  async downloadCommand(scriptCommand: ScriptCommand, commandPath: string) {
    const filename = scriptCommand.filename
    const commandFilePath = path.join(commandPath, scriptCommand.filename)

    const linkFilename = scriptCommand.isTemplate ? `${scriptCommand.identifier}.template` : filename
    const linkCommandFilePath = path.join(this.commandsFolderPath, linkFilename)

    if (fs.existsSync(commandFilePath) == false) {
      try {
        await download(
          sourceCodeRawURL(scriptCommand), 
          commandPath,
          { filename: filename }
        )
      }
      catch (error) {
        console.log(error)
        return
      }
    }

    if (fs.existsSync(linkCommandFilePath) == false && fs.existsSync(commandFilePath)) {
      await afs.symlink(
        commandFilePath,
        linkCommandFilePath
      )
    }
  }
}
