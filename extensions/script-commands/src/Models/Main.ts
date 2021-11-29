import { 
  Group 
} from "@models"

import { 
  Language 
} from "./Language"

export interface Main {
  groups: Group[]
  totalScriptCommands: number,
  languages: Language[]
}