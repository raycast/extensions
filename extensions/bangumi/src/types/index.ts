import { Color } from "@raycast/api"
import type { components } from "./generated"

export type Infobox = components["schemas"]["WikiV0"]

export interface CollectionTag {
  value: string
  color: Color | string
}
