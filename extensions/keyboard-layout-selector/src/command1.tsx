import { getPreferenceValues } from "@raycast/api"
import handleLayoutSelect from "./helpers"
export default async function main () {
  const values = getPreferenceValues()
  const value = values["layout1"]
  await handleLayoutSelect(value)
}
