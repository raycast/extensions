import { Main, ScriptCommand } from "@models"

import { 
  fetchScriptCommands,
  fetchSourceCode
} from "@network"

import { 
  environment, 
  getPreferenceValues 
} from "@raycast/api"

import afs from "fs/promises"
import fs from 'fs'
import { homedir } from "os"
import path from "path"

import { 
  useState, 
  useEffect 
} from "react"

interface Content {
  [identifier: string]: ScriptCommand
}

class ContentManager {
  private content: Content

  constructor() {
    this.content = {}
  }

  getContent = (): Content => this.content

  setContent(content: Content): void {
    this.content = content
  }

  add(command: ScriptCommand): void {
    this.content[command.identifier] = command
  }

  delete(command: ScriptCommand): void {
    if (this.content && this.content[command.identifier] != null) {
      delete this.content[command.identifier]
    }
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
    }
    catch (error) {
      this.persist()
    }
  
    const data = fs.readFileSync(this.databaseFile).toString()
    
    if (data.length > 0) {
      const content: Content = JSON.parse(data)
      this.contentManager.setContent(content)
    }
  }

  private setupFolders(): void {
    fs.mkdirSync(environment.supportPath, { recursive: true })
    fs.mkdirSync(this.repositoryCommandsFolderPath, { recursive: true })
    fs.mkdirSync(this.imagesCommandsFolderPath, { recursive: true })
  }

  private resolvePath(folder: string): string {
    if (folder.length > 0 && folder.startsWith("~")) {
      return path.join(homedir(), folder.slice(1))
    }
  
    return folder
  }

  persist(): void {
    const data = JSON.stringify(this.contentManager.getContent, null, 2)
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
}