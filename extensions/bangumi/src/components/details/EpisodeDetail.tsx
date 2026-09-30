import { ActionPanel, Detail } from "@raycast/api"
import type { components } from "@/types/generated"
import { OpenInBgmBrowser, AITranslateAction } from "@/components/actions"
import { useAITranslate } from "@/shared/useAITranslate"
import { formatSummary, getSubjectDisplay } from "@/shared/utils"

type Episode = components["schemas"]["Episode"]

interface EpisodeDetailProps {
  episode: Episode
}

export default function EpisodeDetail({ episode }: EpisodeDetailProps) {
  const { isTranslating, translate, translationMarkdown } = useAITranslate(`ep_desc_translation_${episode.id}`, {
    formatFn: formatSummary,
  })

  const { title, subtitle: originalTitle } = getSubjectDisplay(episode.name, episode.name_cn, `Episode ${episode.sort}`)

  const markdown = `
# ${title}
${originalTitle && originalTitle !== title ? `<sup>${originalTitle}</sup>` : ""}

${episode.desc ? formatSummary(episode.desc) : "*No description provided.*"}
${translationMarkdown}
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
