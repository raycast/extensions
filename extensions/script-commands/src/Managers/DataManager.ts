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
  ContentStore 
} from "@stores"

import { 
  Command,
  Content,
  ScriptCommandManager, 
  Settings, 
  State,
  StateResult, 
} from "@managers"

import fs from 'fs'

export class DataManager {
  private static instance = new DataManager()

  private contentManager: ContentStore
  private scriptCommandManager: ScriptCommandManager
  private settings = new Settings()

  static shared(): DataManager { 
    return this.instance
  }

  private constructor() {
    this.contentManager = new ContentStore()

    this.scriptCommandManager = new ScriptCommandManager(
      this.contentManager,
      this.settings
    )

    this.setupFolders()
    this.loadDatabase()
  }
  
  private loadDatabase(): void {
    try {
      fs.accessSync(this.settings.databaseFile, fs.constants.R_OK)

      if (fs.existsSync(this.settings.databaseFile)) {
        const data = fs.readFileSync(this.settings.databaseFile).toString()
        
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
      this.settings.supportPath,
      this.settings.repositoryCommandsFolderPath,
      this.settings.imagesCommandsFolderPath
    ]

    paths.forEach((path) => {
      fs.mkdirSync(
        path, 
        { recursive: true }
      )  
    })
  }

  persist(): void {
    const data = JSON.stringify(this.contentManager.getContent(), null, 2)

    if ((data != null || data != undefined) && data.length > 0)
      fs.writeFileSync(this.settings.databaseFile, data)
  }

  clear(): void {
    this.contentManager.clear()
    this.persist()
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
  
  async installScriptCommand(scriptCommand: ScriptCommand): Promise<StateResult> {
    const result = await this.scriptCommandManager.install(scriptCommand)

    if (result.content == State.Installed || result.content == State.NeedSetup)
      this.persist()

    return result
  }
  
  async deleteScriptCommand(scriptCommand: ScriptCommand): Promise<StateResult> {
    const result = await this.scriptCommandManager.delete(scriptCommand)

    if (result.content == State.NotInstalled)
      this.persist()

    return result
  }

}