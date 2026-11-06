import { withAccessToken } from "@raycast/utils"
import { highseat, request } from "../lib/highseat"

type Input = {
  /** The site's domain as registered, or its id. */
  site: string
  /** The note's day, as YYYY-MM-DD. */
  date?: string
  /** The note's text, up to 200 characters. */
  text?: string
  /** The note's id, from the notes list. */
  id?: string
}

export default withAccessToken(highseat)(async ({ site, id, ...body }: Input) => {
  if (id) return request("patch", "/sites/{site}/notes/{id}", { path: { site, id }, body })
  return request("post", "/sites/{site}/notes", { path: { site }, body })
})
