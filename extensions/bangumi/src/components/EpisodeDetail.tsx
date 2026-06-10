import { ActionPanel, Detail } from "@raycast/api"
import type { components } from "@/types/generated"
import { OpenInBgmBrowser } from "./actions"
import { useAITranslate, getTranslationMarkdown, AITranslateAction } from "@/shared/useAITranslate"
import { formatSummary } from "@/shared/utils"

type Episode = components["schemas"]["Episode"]

interface EpisodeDetailProps {
  episode: Episode
}

export default function EpisodeDetail({ episode }: EpisodeDetailProps) {
  const { translatedText, isTranslating, translate } = useAITranslate(`ep_desc_translation_${episode.id}`)

  const title = episode.name_cn || episode.name || `Episode ${episode.sort}`
  const originalTitle = episode.name

  const markdown = `
# ${title}
${originalTitle && originalTitle !== title ? `> ${originalTitle}` : ""}

${episode.desc ? formatSummary(episode.desc) : "*No description provided.*"}
${getTranslationMarkdown(isTranslating, translatedText, formatSummary)}
  `

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Episode" text={String(episode.sort)} />
          {episode.airdate && <Detail.Metadata.Label title="Airdate" text={episode.airdate} />}
          {episode.duration && <Detail.Metadata.Label title="Duration" text={episode.duration} />}
          {episode.comment !== undefined && <Detail.Metadata.Label title="Comments" text={String(episode.comment)} />}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <OpenInBgmBrowser path={`ep/${episode.id}`} />
          <AITranslateAction text={episode.desc} onTranslate={translate} isTranslating={isTranslating} />
        </ActionPanel>
      }
    />
  )
}
