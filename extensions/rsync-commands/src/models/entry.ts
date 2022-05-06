import EntryLocation, { EntryLocationRaw } from "./entry-location"
import { EntryOptionData } from "../data/rsync-options"
import Sugar from "sugar"

export type SshSelection = "none" | "source" | "destination"
export type EntryOption = {
  value?: string
  enabled?: boolean
} & EntryOptionData
type Options = { [key: string]: EntryOption }

export default class Entry {
  public id: string | undefined
  public name: string
  public description: string
  public source: EntryLocation
  public destination: EntryLocation
  public options: Options
  public sshSelection: SshSelection
  public pinned: boolean
  public confirmed: boolean // If the user has confirmed that this entry looks good before running it.
  public runCount: number
  public createdAt: number

  constructor(rawData?: EntryRaw) {
    if (rawData) {
      this.id = rawData.id
      this.name = rawData.name
      this.description = rawData.description
      this.source = new EntryLocation(rawData.source)
      this.destination = new EntryLocation(rawData.destination)
      this.options = rawData.options
      this.sshSelection = rawData.sshSelection
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
      this.pinned = false
      this.confirmed = false
      this.runCount = 0
      this.createdAt = new Date().getTime()
    }
  }

  validate() {
    if (!this.name.trim()) throw "Entry is missing a name."
    this.source.validate("source", this.sshSelection === "source")
    this.destination.validate("destination", this.sshSelection === "destination")
  }

  getCommand(): string {
    const cmd = ["rsync"]

    for (const [, option] of Object.entries(this.options)) {
      const { name, param, value } = option
      let optionCommand = `--${name}`
      if (param && !value) throw `Option "${name}" does not have a value.`
      if (value) optionCommand = `${optionCommand}=${value}`
      cmd.push(optionCommand)
    }

    if (this.sshSelection !== "none") {
      const port = this[this.sshSelection].port
      if (isNaN(Number(port))) throw `Port entered for ${this.sshSelection} has to be a number.`
      cmd.push(port !== "22" ? `-e "ssh -p ${port}"` : `-e ssh`)
    }

    cmd.push(
      ...[
        this.source.getCommandPart("source", this.sshSelection === "source"),
        this.destination.getCommandPart("source", this.sshSelection === "destination"),
      ]
    )

    return cmd.join(" ")
  }

  toRawData(): EntryRaw {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      source: this.source.toRawData(),
      destination: this.destination.toRawData(),
      options: this.options,
      sshSelection: this.sshSelection,
      pinned: this.pinned,
      confirmed: this.confirmed,
      runCount: this.runCount,
      createdAt: this.createdAt,
    }
  }

  clone(): Entry {
    return new Entry(Sugar.Object.clone(this.toRawData(), true) as EntryRaw)
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

  equals(entry: Entry) {
    return JSON.stringify(entry.toRawData()) === JSON.stringify(this.toRawData())
  }
}

export type EntryRaw = {
  id: string | undefined
  name: string
  description: string
  source: EntryLocationRaw
  destination: EntryLocationRaw
  options: Options
  sshSelection: SshSelection
  pinned: boolean
  confirmed: boolean
  runCount: number
  createdAt: number
}
