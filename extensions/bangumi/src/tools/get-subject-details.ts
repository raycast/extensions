import { withAccessToken } from "@raycast/utils"
import { formatSubjectToMarkdown, formatInfoboxToMarkdown } from "./utils"
import { getCollectionTag } from "@/shared/utils"
import { bangumi, bangumiAuth } from "@/api"

type Input = {
  /**
   * The ID of the subject to fetch details for.
   */
  subjectId: number
}

const tool = async (input: Input) => {
  const [result, collection] = await Promise.all([
    bangumi.getSubjectById({ subjectId: input.subjectId }),
    bangumi.getSubjectCollection({ subjectId: input.subjectId }),
  ])

  const baseMd = formatSubjectToMarkdown(result)
  const tagsStr = result.tags.map((t) => t.name).join(", ") || "None"

  const infoboxStr = formatInfoboxToMarkdown(result.infobox)

  const statusStr = collection ? getCollectionTag(collection.type, result.type).value : "Not Collected"
  const progressStr = collection
    ? `\n  - My Progress: ${collection.ep_status || 0} eps watched` +
      (collection.vol_status ? `, ${collection.vol_status} vols read` : "")
    : ""
  const rateStr = collection?.rate ? `\n  - My Rating: ${collection.rate}` : ""

  const detailedMd = `${baseMd}
  - Total Episodes: ${result.total_episodes || "Unknown"}
  - Tags: ${tagsStr}
  - My Status: ${statusStr}${progressStr}${rateStr}
  
  ### Summary
  ${result.summary || "No summary available."}${infoboxStr}`

  return `# Subject Details\n\n${detailedMd}`
}

export default withAccessToken(bangumiAuth)(tool)
