import { 
  CompactGroup,
  Language,
  MainCompactGroup, 
  ScriptCommand,
} from "@models"

import { 
  fetchReadme,
  fetchScriptCommands,
  fetchSourceCode,
} from "@network"

import { 
  ContentStore,
} from "@stores"

import { 
  ScriptCommandManager, 
  Settings, 
} from "@managers"

import { 
  Command,
  Content,
  FileNullable,
  Filter,
  State,
  StateResult, 
} from "@types"

import fs from 'fs'

export class DataManager {
  private static instance = new DataManager()

  private contentManager: ContentStore
  private scriptCommandManager: ScriptCommandManager
  private settings = new Settings()
  private mainContent: MainCompactGroup

  static shared(): DataManager { 
    return this.instance
  }

  private constructor() {
    this.contentManager = new ContentStore()

    this.scriptCommandManager = new ScriptCommandManager(
      this.contentManager,
      this.settings
    )

    this.mainContent = {
      groups: [],
      languages: [],
      totalScriptCommands: 0
    }

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
  
  private hashFromFile(path: string): string {
    return this.scriptCommandManager.hashFromFile(path)
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

  private isCommandChanged(identifier: string): boolean {
    const command = this.contentManager.contentFor(identifier)

    if (command == null)
      return false

    const commandPath = command.files.command.path
    const commandHash = command.sha
    const currentFileHash = this.hashFromFile(commandPath)

    return commandHash != currentFileHash
  }

  commandFileFor(identifier: string): FileNullable {
    const command = this.contentManager.contentFor(identifier)

    if (command == null)
      return null

    return command.files.command
  }

  stateFor(scriptCommand: ScriptCommand): State {
    const downloaded = this.isCommandDownloaded(scriptCommand.identifier)
    const needSetup = this.isCommandNeedsSetup(scriptCommand.identifier)
    const changedContent = this.isCommandChanged(scriptCommand.identifier)

    let state: State = State.NotInstalled

    if (downloaded) {
      state =  State.Installed

      if (changedContent)
        state = State.ChangesDetected
      else if (needSetup) 
        state = State.NeedSetup
    }

    return state
  }

  private stateDescription(state: State): string {
    switch (state) {
    case State.Error:
      return "Error"
    case State.Installed:
      return "Installed"
    case State.NeedSetup:
      return "Need Setup"
    case State.NotInstalled:
      return "Not Installed"
    case State.ChangesDetected:
      return "Changed Detected"
    }
  }

  fetchLanguages(): Language[] {
    return this.mainContent.languages
  }

  async fetchCommands(filter: Filter = null): Promise<MainCompactGroup> {
    if (filter != null)
      return this.filterCommands(filter)

    if (this.mainContent.groups.length > 0)
      return this.mainContent

    this.mainContent = await fetchScriptCommands()

    return this.mainContent
  }

  private filterCommands(filter: Filter): MainCompactGroup {
    let data = {... this.mainContent }
    data.totalScriptCommands = 0

    if (filter == null)
      return data

    if (typeof(filter) === "string") {
      const groups: CompactGroup[] = []

      data.groups.forEach(group => {
        const groupCopy = {... group}
        groupCopy.scriptCommands = []

        group.scriptCommands.forEach(scriptCommand => { 
          if (scriptCommand.language == filter) {
            groupCopy.scriptCommands.push(scriptCommand)
          }
        })

        if (groupCopy.scriptCommands.length > 0) {
          groupCopy.scriptCommands.sort((left: ScriptCommand, right: ScriptCommand) => {
            return (left.title > right.title) ? 1 : -1
          })

          data.totalScriptCommands += groupCopy.scriptCommands.length
          groups.push(groupCopy)
        }
      })

      groups.sort((left: CompactGroup, right: CompactGroup) => {
        return (left.title > right.title) ? 1 : -1
      })

      data.groups = groups
    }
    else {
      const content = this.contentManager.getContent()

      const group: CompactGroup = {
        identifier: "installed-script-commands",
        title: "Installed",
        subtitle: "Script Commands",
        scriptCommands: []
      }
      
      Object.values(content).forEach(item => {
        if ((filter == State.NeedSetup && item.needsSetup == true) || filter == State.Installed)
          group.scriptCommands.push(item.scriptCommand)
      })

      data = {
        groups: [group],
        totalScriptCommands: group.scriptCommands.length,
        languages: []
      }
    }

    return data
  }

  async fetchSourceCode(scriptCommand: ScriptCommand): Promise<string> {
    return fetchSourceCode(scriptCommand)
  }

  async fetchReadme(path: string): Promise<string> {
    return fetchReadme(path)
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

  async confirmScriptCommandSetup(scriptCommand: ScriptCommand): Promise<StateResult> {
    // TODO: Implement the logic to rename the symbolic link
    // and return the new state (Installed), which will make the cell be 
    // re-rendered changing the icon for a proper green checkmark

    // TODO: Investigate why the check for the file content isn't being well observed
    // to reflect in the cell, really after the content change

    return {
      content: State.Installed,
      message: ""
    }
  }
}