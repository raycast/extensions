import { 
  Settings,
} from "@managers"

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
} from "@types"

import { 
  ScriptCommand,
} from "@models"

import { 
  ContentStore 
} from "@stores"  

import { 
  iconDarkURLFor,
  iconLightURLFor,
  IconStyle, 
  IconType,
  sourceCodeRawURL,
} from "@urls"  

import path from "path"

import download from "download"

import afs from "fs/promises"

import fs from 'fs'

export class ScriptCommandManager {
  private contentStore: ContentStore
  private settings: Settings

  constructor(
    contentStore: ContentStore, 
    settings: Settings
  ) {
    this.contentStore = contentStore
    this.settings = settings
  }

  async install(scriptCommand: ScriptCommand): Promise<StateResult> {
    const commandFullPath = path.join(this.settings.repositoryCommandsFolderPath, scriptCommand.path)
  
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

    this.contentStore.add(resource)

    return {
      content: scriptCommand.isTemplate ? State.NeedSetup : State.Installed,
      message: ""
    }
  }

  async delete(scriptCommand: ScriptCommand): Promise<StateResult> {
    const content = this.contentStore.contentFor(scriptCommand.identifier)
 
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
        this.contentStore.delete(scriptCommand.identifier)

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
    const linkImagePath = path.join(this.settings.imagesCommandsFolderPath, filename)

    if (fs.existsSync(imagePath) == false) {
      await download(
        url, 
        imageFolderPath, 
        { filename: filename }
      )

      if (fs.existsSync(this.settings.imagesCommandsFolderPath) == false) {
        fs.mkdirSync(
          this.settings.imagesCommandsFolderPath, 
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
    const linkCommandFilePath = path.join(this.settings.commandsFolderPath, linkFilename)

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

    const content = this.contentStore.getContent()

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

    return IconUsage.LastScriptUsing
  }
}