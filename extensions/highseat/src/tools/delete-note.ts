import { Action } from "@raycast/api"
import { withAccessToken } from "@raycast/utils"
import { api, highseat } from "../lib/highseat"

type Input = {
  /** The site's domain as registered, or its id. */
  site: string
  /** The note's id, from the notes list. */
  id: string
}

export default withAccessToken(highseat)(async ({ site, id }: Input) => {
  await api.delete("/sites/{site}/notes/{id}", { path: { site, id } })
  return { deleted: id }
})

export const confirmation = withAccessToken(highseat)(async ({ site, id }: Input) => {
  const { data: note } = await api.get("/sites/{site}/notes/{id}", { path: { site, id } })
  const label = `${note.date}: ${note.text}`

  return {
    style: Action.Style.Destructive,
    message: `Delete this note from ${site}? This cannot be undone.`,
    info: [
      { name: "Site", value: site },
      { name: "Note", value: label },
    ],
  }
})
