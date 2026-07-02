import { Action, ActionPanel, Detail, Icon } from "@raycast/api"
import { usePromise, withAccessToken } from "@raycast/utils"
import { useRef } from "react"
import { CollectionStatusActions, OpenInBgmBrowser, AITranslateAction } from "@/components/actions"
import { SubjectCharactersList, SubjectRelationsList } from "@/components/lists"
import { SubjectCollectionIcon } from "@/shared/const"
import { formatSummary, getImageUrl, getCollectionTag, getSubjectDisplay } from "@/shared/utils"
import { useAITranslate } from "@/shared/useAITranslate"
import { bangumi, bangumiAuth } from "@/api"

interface SubjectDetailProps {
  subjectId: number
}

const SubjectDetail = ({ subjectId }: SubjectDetailProps) => {
  const abortable = useRef<AbortController>(null)
  const collectionAbortable = useRef<AbortController>(null)

  const { data, isLoading } = usePromise(
    async (id) => {
      const res = await bangumi.getSubjectById({ subjectId: id, signal: abortable.current?.signal })
      return res
    },
    [subjectId],
    { abortable }
  )

  const {
    data: collection,
    isLoading: isCollectionLoading,
    mutate: mutateCollection,
  } = usePromise(
    async (id) => {
      const res = await bangumi.getSubjectCollection({ subjectId: id, signal: collectionAbortable.current?.signal })
      return res
    },
    [subjectId],
    { abortable: collectionAbortable }
  )

  const { isTranslating, translate, translationMarkdown } = useAITranslate(`subject_summary_translation_${subjectId}`, {
    formatFn: formatSummary,
  })

  const coverUrl = getImageUrl(data?.images.large)
  const { title: name, subtitle: subtitleName } = getSubjectDisplay(data?.name, data?.name_cn, "")

  const markdown = data
    ? `
${coverUrl ? `<img src="${coverUrl}" width="120%" />` : ""}

${name.length > 20 ? "###" : name.length > 15 ? "##" : "#"} ${name}
${subtitleName ? `\n<sup>${subtitleName}</sup>` : ""}

${formatSummary(data.summary)}${translationMarkdown}
`
    : ""

  return (
    <Detail
      isLoading={isLoading || isCollectionLoading || isTranslating}
      markdown={markdown}
      metadata={
        data ? (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Rating"
              text={data.rating.score ? `${data.rating.score.toFixed(1)} / 10` : "N/A"}
              icon={Icon.Star}
            />
            {data.rating.rank ? (
              <Detail.Metadata.Label title="Rank" text={`#${data.rating.rank}`} icon={Icon.Trophy} />
            ) : null}
            {data.date ? <Detail.Metadata.Label title="Air Date" text={data.date} icon={Icon.Calendar} /> : null}
            <Detail.Metadata.Label
              title="Episodes"
              text={data.eps ? data.eps.toString() : data.total_episodes ? data.total_episodes.toString() : "N/A"}
              icon={Icon.List}
            />
            {data.tags.length > 0 && (
              <Detail.Metadata.TagList title="Tags">
                {data.tags.slice(0, 5).map((tag) => (
                  <Detail.Metadata.TagList.Item key={tag.name} text={tag.name} />
                ))}
              </Detail.Metadata.TagList>
            )}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="My Status"
              text={collection ? getCollectionTag(collection.type, data.type).value : "Uncollected"}
              icon={collection ? SubjectCollectionIcon[collection.type] : Icon.Circle}
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Doing" text={data.collection.doing.toString()} icon={Icon.Play} />
            <Detail.Metadata.Label title="Wishlist" text={data.collection.wish.toString()} icon={Icon.Heart} />
            <Detail.Metadata.Label title="Collected" text={data.collection.collect.toString()} icon={Icon.Check} />
          </Detail.Metadata>
        ) : null
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Show Related Subjects"
              icon={Icon.List}
              target={<SubjectRelationsList title="Related Subjects" subjectId={subjectId} />}
            />
            <Action.Push
              title="Show Characters & Voice Actors"
              icon={Icon.List}
              target={<SubjectCharactersList subjectId={subjectId} />}
            />
            <AITranslateAction text={data?.summary} onTranslate={translate} isTranslating={isTranslating} />
            <OpenInBgmBrowser path={`subject/${subjectId}`} />
          </ActionPanel.Section>
          <CollectionStatusActions
            subjectId={subjectId}
            subjectType={data?.type}
            currentStatus={collection?.type}
            onStatusChange={mutateCollection}
          />
        </ActionPanel>
      }
    />
  )
}

export default withAccessToken(bangumiAuth)(SubjectDetail)
