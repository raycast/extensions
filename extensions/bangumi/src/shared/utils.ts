import { SubjectCollectionType, SubjectType, SubjectVerb, SubjectCollectionColor } from "@/shared/const"
import { CollectionTag } from "@/types"

export const getCollectionTag = (
  collectionType: SubjectCollectionType,
  subjectType: SubjectType = SubjectType.Anime
): CollectionTag => {
  const verbs = SubjectVerb[subjectType]
  const color = SubjectCollectionColor[collectionType]

  switch (collectionType) {
    case SubjectCollectionType.Wish:
      return { value: verbs.wish, color }
    case SubjectCollectionType.Collect:
      return { value: verbs.collect, color }
    case SubjectCollectionType.Doing:
      return { value: verbs.doing, color }
    case SubjectCollectionType.OnHold:
      return { value: "On Hold", color }
    case SubjectCollectionType.Dropped:
      return { value: "Dropped", color }
    default:
      return { value: "Unknown", color }
  }
}

export const formatSummary = (summary?: string) =>
  summary
    ?.split(/\r?\n/)
    .filter(Boolean)
    .map((line) => `<p>${line}</p>`)
    .join("") || "No summary available."

export const getImageUrl = (url?: string) => {
  if (!url) return undefined
  return url.replace(/^http:\/\//i, "https://")
}
