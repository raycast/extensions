import { Action, ActionPanel, Detail, Icon } from "@raycast/api"
import { usePromise, withAccessToken } from "@raycast/utils"
import { useRef } from "react"
import { Infobox } from "@/types"
import { OpenInBgmBrowser, AITranslateAction } from "@/components/actions"
import { CharacterRelationsList } from "@/components/lists"
import { formatSummary, getImageUrl } from "@/shared/utils"
import { useAITranslate } from "@/shared/useAITranslate"
import { bangumi, bangumiAuth } from "@/api"

interface CharacterDetailProps {
  characterId: number
}

const CharacterDetail = ({ characterId }: CharacterDetailProps) => {
  const abortable = useRef<AbortController>(null)

  const { data, isLoading } = usePromise(
    async (id) => {
      return await bangumi.getCharacterById({ characterId: id, signal: abortable.current?.signal })
    },
    [characterId],
    { abortable }
  )

  const { isTranslating, translate, translationMarkdown } = useAITranslate(`char_summary_translation_${characterId}`, {
    formatFn: formatSummary,
  })

  const coverUrl = getImageUrl(data?.images?.large)
  const infobox = data?.infobox as Infobox | undefined
  const nameCnItem = infobox?.find((box) => box.key === "简体中文名")
  const nameCn = nameCnItem && typeof nameCnItem.value === "string" ? nameCnItem.value : ""

  const titleName = nameCn || data?.name

  const markdown = data
    ? `# ${titleName}
<table>
  <tr>
    <td width="100" valign="top">${coverUrl ? `<img src="${coverUrl}" width="100" />` : ""}</td>
    <td valign="top">${formatSummary(data.summary)}${translationMarkdown}</td>
  </tr>
</table>
`
    : ""

  return (
    <Detail
      isLoading={isLoading || isTranslating}
      navigationTitle="Character Detail"
      markdown={markdown}
      metadata={
        data ? (
          <Detail.Metadata>
            {infobox?.map((box) => {
              if (box.key === "简体中文名") return null

              if (typeof box.value === "string") {
                return <Detail.Metadata.Label key={box.key} title={box.key} text={box.value} />
              }

              if (Array.isArray(box.value)) {
                return (
                  <Detail.Metadata.TagList key={box.key} title={box.key}>
                    {box.value.map((item, idx) => (
                      <Detail.Metadata.TagList.Item key={idx} text={"k" in item ? `${item.k}: ${item.v}` : item.v} />
                    ))}
                  </Detail.Metadata.TagList>
                )
              }

              return null
            })}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Collects" text={data.stat.collects.toString()} icon={Icon.Heart} />
            <Detail.Metadata.Label title="Comments" text={data.stat.comments.toString()} icon={Icon.Message} />
          </Detail.Metadata>
        ) : null
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Show Related Works"
              icon={Icon.List}
              target={<CharacterRelationsList title="Related Works" characterId={characterId} />}
            />
            <AITranslateAction text={data?.summary} onTranslate={translate} isTranslating={isTranslating} />
            <OpenInBgmBrowser path={`character/${characterId}`} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  )
}

export default withAccessToken(bangumiAuth)(CharacterDetail)
