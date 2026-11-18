import { SubjectType, SubjectTypeName, EpisodeTypePrefix, EpisodeType } from "@/shared/const"
import { getSubjectDisplay, translateInfoboxKey } from "@/shared/utils"
import type { components } from "@/types/generated"

type AnySubject = {
  id?: number
  name?: string
  name_cn?: string
  type?: number
  air_date?: string
  date?: string
  eps?: number
  url?: string
  platform?: string
  rating?: { score?: number; rank?: number; total?: number }
  collection?: { doing?: number }
}

export const formatSubjectToMarkdown = (anime: AnySubject) => {
  const typeName = anime.type ? SubjectTypeName[anime.type as SubjectType] : "Unknown"

  // LegacySubjectSmall uses air_date, Subject uses date
  const dateStr = anime.air_date || anime.date || "Unknown"

  // LegacySubjectSmall uses eps, but it might be missing
  const epsStr = anime.eps ?? "Unknown"

  const urlStr = anime.url ?? `https://bgm.tv/subject/${anime.id}`
  const rankStr = anime.rating?.rank ? ` (Rank: #${anime.rating.rank})` : ""
  const totalRaters = anime.rating?.total ? ` (${anime.rating.total} ratings)` : ""
  const platformStr = anime.platform ? `[${anime.platform}] ` : ""

  const { title } = getSubjectDisplay(anime.name, anime.name_cn, "Unknown")

  return `### ${platformStr}${title} (\`subjectId: ${anime.id}\`)
  - Original Name: ${anime.name}
  - Type: ${typeName} (\`subjectType: ${anime.type}\`)
  - Rating: ${anime.rating?.score ?? "N/A"}${rankStr}${totalRaters}
  - Episodes: ${epsStr}
  - Air Date: ${dateStr}
  - URL: ${urlStr}`
}

type Character = components["schemas"]["Character"]

export const formatCharacterToMarkdown = (character: Character) => {
  const infoboxStr = formatInfoboxToMarkdown(character.infobox as unknown as WikiV0)

  return `### ${character.name} (\`characterId: ${character.id}\`)
  - Type: ${character.type === 1 ? "Character" : "Person"}${infoboxStr}`
}

type Episode = components["schemas"]["Episode"]
export const formatEpisodeToMarkdown = (episode: Episode) => {
  const typeStr = EpisodeTypePrefix[episode.type as EpisodeType] ?? "Other"
  const durationStr = episode.duration ? ` - Duration: ${episode.duration}` : ""
  const descStr = episode.desc ? `\n    - Desc: ${episode.desc.replace(/\n/g, " ")}` : ""
  const { title } = getSubjectDisplay(episode.name, episode.name_cn, `Episode ${episode.sort}`)
  return `- **${typeStr}${episode.ep}**: ${title} (\`episodeId: ${episode.id}\`)
    - Air Date: ${episode.airdate || "Unknown"}${durationStr}${descStr}`
}

type WikiV0 = components["schemas"]["WikiV0"]

export const formatInfoboxToMarkdown = (infobox?: WikiV0) => {
  if (!infobox || infobox.length === 0) return ""
  const lines = infobox.map((item) => {
    let valStr = ""
    if (typeof item.value === "string") {
      valStr = item.value
    } else if (Array.isArray(item.value)) {
      valStr = item.value.map((v) => v.v).join(", ")
    }
    return `- ${translateInfoboxKey(item.key)}: ${valStr}`
  })
  return `\n\n### Metadata\n${lines.join("\n")}`
}
