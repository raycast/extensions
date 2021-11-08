import { Group } from "@models"

export interface Main {
  groups: Group[]
  totalScriptCommands: number
  updatedAt: Date
}