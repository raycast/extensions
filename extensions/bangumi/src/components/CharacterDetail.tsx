import { Action, ActionPanel, Detail, Icon } from "@raycast/api"
import { usePromise, withAccessToken } from "@raycast/utils"
import { useRef } from "react"
import { bangumi } from "@/api/bangumi"
import { Infobox } from "@/types"
import { bangumiAuth } from "@/api/oauth"
import { OpenInBgmBrowser, AITranslateAction } from "./actions"
import RelationsList from "./RelationsList"
import { formatSummary, getImageUrl } from "@/shared/utils"
import { useAITranslate } from "@/shared/useAITranslate"

interface CharacterDetailProps {
  characterId: number
}

const CharacterDetail = ({ characterId }: CharacterDetailProps) => {
  const abortable = useRef<AbortController>(null)
  const subjectsAbortable = useRef<AbortController>(null)

  const { data, isLoading } = usePromise(
    async (id) => {
      return await bangumi.getCharacterById({ characterId: id, signal: abortable.current?.signal })
    },
    [characterId],
    { abortable }
  )

  const { data: subjects, isLoading: isSubjectsLoading } = usePromise(
    async (id) => {
      return await bangumi.getRelatedSubjectsByCharacterId({
        characterId: id,
        signal: subjectsAbortable.current?.signal,
      })
    },
    [characterId],
    { abortable: subjectsAbortable }
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
      isLoading={isLoading || isSubjectsLoading || isTranslating}
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
            {subjects?.length ? (
              <Action.Push
                title="Show Related Works"
                icon={Icon.List}
                target={
                  <RelationsList
                    title="Related Works"
                    relations={subjects.map((sub) => ({
                      id: sub.id,
                      name: sub.name,
                      name_cn: sub.name_cn,
                      image: sub.image,
                      relationType: sub.staff,
                      subjectType: sub.type,
                    }))}
                  />
                }
              />
            ) : null}
            <AITranslateAction text={data?.summary} onTranslate={translate} isTranslating={isTranslating} />
            <OpenInBgmBrowser path={`character/${characterId}`} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  )
}

export default withAccessToken(bangumiAuth)(CharacterDetail)
