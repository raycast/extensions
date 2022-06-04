import EntryLocation, { EntryLocationRaw } from "./entry-location"
import { EntryOptionData } from "../data/rsync-options"
import Sugar from "sugar"

export type SshSelection = "none" | "source" | "destination"
export type EntryOption = {
  enabled: boolean
  value?: string
} & Omit<EntryOptionData, "description">
type Options = { [key: string]: EntryOption }

export default class Entry {
  public id: string | undefined
  public name: string
  public description: string
  public source: EntryLocation
  public destination: EntryLocation
  public options: Options
  public sshSelection: SshSelection
  public preCommand: string
  public postCommand: string
  public pinned: boolean
  public confirmed: boolean // If the user has confirmed that this entry looks good before running it.
  public runCount: number
  public createdAt: number

  constructor(rawData?: EntryDTO) {
    if (rawData) {
      this.id = rawData.id
      this.name = rawData.name
      this.description = rawData.description
      this.source = new EntryLocation(rawData.source)
      this.destination = new EntryLocation(rawData.destination)
      this.options = rawData.options
      this.sshSelection = rawData.sshSelection
      this.preCommand = rawData.preCommand?.replace(/\\"/g, '"') ?? ""
      this.postCommand = rawData.postCommand?.replace(/\\"/g, '"') ?? ""
      this.pinned = rawData.pinned
      this.confirmed = rawData.confirmed
      this.runCount = rawData.runCount
      this.createdAt = rawData.createdAt
    } else {
      this.id = undefined
      this.name = ""
      this.description = ""
      this.source = new EntryLocation()
      this.destination = new EntryLocation()
      this.options = {}
      this.sshSelection = "none"
      this.preCommand = ""
      this.postCommand = ""
      this.pinned = false
      this.confirmed = false
      this.runCount = 0
      this.createdAt = new Date().getTime()
    }
  }

  getErrors(skipName = false) {
    const errors: string[] = []

    if (!skipName && !this.name.trim()) errors.push("Name is missing.")

    for (const option of Object.values(this.options)) {
      const { name, param, value } = option
      if (param && !value) errors.push(`Option "${name}" does not have a value.`)
    }

    errors.push(...this.source.getErrors("source", this.sshSelection === "source"))
    errors.push(...this.destination.getErrors("destination", this.sshSelection === "destination"))

    return errors
  }

  getCommand(): string {
    const sshLocation: EntryLocation | undefined = this.sshSelection !== "none" ? this[this.sshSelection] : undefined
    const { port, identityFile: sshIdentityFile } = sshLocation ?? {}
    const sshPort = !port || port.trim() === "22" ? undefined : port.trim()
    const rsyncCommand = ["rsync"]

    for (const [, option] of Object.entries(this.options)) {
      const { enabled, name, param, value } = option
      if (enabled) {
        let optionCommand = `--${name}`
        if (param && !value) throw `Option "${name}" does not have a value.`
        if (value) optionCommand = `${optionCommand}=${value}`
        rsyncCommand.push(optionCommand)
      }
    }

    if (sshLocation) {
      const eOption = ["-e"]
      if (sshPort || sshIdentityFile) {
        const portOption = sshPort ? ` -p ${sshPort}` : ""
        const identityFileOption = sshIdentityFile ? ` -i ${sshIdentityFile}` : ""
        eOption.push(`"ssh${portOption}${identityFileOption}"`)
      } else {
        eOption.push("ssh")
      }
      rsyncCommand.push(eOption.join(" "))
    }

    rsyncCommand.push(
      ...[
        this.source.getCommandPart("source", this.sshSelection === "source"),
        this.destination.getCommandPart("source", this.sshSelection === "destination"),
      ]
    )

    const commands = [this.preCommand, rsyncCommand.join(" "), this.postCommand].filter(Boolean)
    return commands.join(`
    `)
  }

  toRawData(): EntryDTO {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      source: this.source.toRawData(),
      destination: this.destination.toRawData(),
      options: this.options,
      sshSelection: this.sshSelection,
      preCommand: this.preCommand.replace(/"/g, '\\"'),
      postCommand: this.postCommand.replace(/"/g, '\\"'),
      pinned: this.pinned,
      confirmed: this.confirmed,
      runCount: this.runCount,
      createdAt: this.createdAt,
    }
  }

  clone(): Entry {
    return new Entry(Sugar.Object.clone(this.toRawData(), true) as EntryDTO)
  }

  /**
   * Duplicate entry, resetting entry unique data.
   */
  duplicate(): Entry {
    const clone = this.clone()
    clone.id = undefined
    clone.name = `${clone.name} Duplicate`
    clone.pinned = false
    clone.confirmed = false
    clone.runCount = 0
    clone.createdAt = new Date().getTime()
    return clone
  }

  // noinspection JSUnusedGlobalSymbols
  equals(entry: Entry) {
    return JSON.stringify(entry.toRawData()) === JSON.stringify(this.toRawData())
  }
}

export type EntryDTO = {
  id: string | undefined
  name: string
  description: string
  source: EntryLocationRaw
  destination: EntryLocationRaw
  options: Options
  sshSelection: SshSelection
  preCommand: string
  postCommand: string
  pinned: boolean
  confirmed: boolean
  runCount: number
  createdAt: number
}
