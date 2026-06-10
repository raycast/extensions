import { Action, ActionPanel, Detail, Icon } from "@raycast/api"
import { usePromise, withAccessToken } from "@raycast/utils"
import { useRef } from "react"
import { bangumi } from "@/api/bangumi"
import { bangumiAuth } from "@/api/oauth"
import { CollectionStatusActions, OpenInBgmBrowser } from "./actions"
import SubjectCharactersList from "./SubjectCharactersList"
import RelationsList from "./RelationsList"
import { getCollectionTag, SubjectCollectionIcon } from "@/shared/const"
import { formatSummary, getImageUrl } from "@/shared/utils"
import { useAITranslate, getTranslationMarkdown, AITranslateAction } from "@/shared/useAITranslate"

interface SubjectDetailProps {
  subjectId: number
}

const SubjectDetail = ({ subjectId }: SubjectDetailProps) => {
  const abortable = useRef<AbortController>(null)
  const collectionAbortable = useRef<AbortController>(null)
  const charactersAbortable = useRef<AbortController>(null)
  const relatedSubjectsAbortable = useRef<AbortController>(null)

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

  const { data: characters, isLoading: isCharactersLoading } = usePromise(
    async (id) => {
      const res = await bangumi.getSubjectCharacters({ subjectId: id, signal: charactersAbortable.current?.signal })
      return res
    },
    [subjectId],
    { abortable: charactersAbortable }
  )

  const { data: relatedSubjects, isLoading: isRelatedSubjectsLoading } = usePromise(
    async (id) => {
      const res = await bangumi.getRelatedSubjectsBySubjectId({
        subjectId: id,
        signal: relatedSubjectsAbortable.current?.signal,
      })
      return res
    },
    [subjectId],
    { abortable: relatedSubjectsAbortable }
  )

  const { translatedText, isTranslating, translate } = useAITranslate(`subject_summary_translation_${subjectId}`)

  const coverUrl = getImageUrl(data?.images?.large)
  const name = data?.name_cn || data?.name || ""
  const subtitleName = data?.name && data.name !== name ? data.name : ""

  const markdown = data
    ? `
${coverUrl ? `<img src="${coverUrl}" width="120%" />` : ""}

${name.length > 20 ? "###" : name.length > 15 ? "##" : "#"} ${name}
${subtitleName ? `\n<sup>${subtitleName}</sup>` : ""}

${formatSummary(data.summary)}${getTranslationMarkdown(isTranslating, translatedText, formatSummary)}
`
    : ""

  return (
    <Detail
      isLoading={isLoading || isCollectionLoading || isCharactersLoading || isRelatedSubjectsLoading || isTranslating}
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
            {relatedSubjects?.length ? (
              <Action.Push
                title="Show Related Subjects"
                icon={Icon.List}
                target={
                  <RelationsList
                    title="Related Subjects"
                    relations={relatedSubjects.map((rel) => ({
                      id: rel.id,
                      name: rel.name,
                      name_cn: rel.name_cn,
                      image: rel.images?.grid,
                      relationType: rel.relation,
                      subjectType: rel.type,
                    }))}
                  />
                }
              />
            ) : null}
            {characters?.length ? (
              <Action.Push
                title="Show Characters & Voice Actors"
                icon={Icon.List}
                target={<SubjectCharactersList characters={characters} />}
              />
            ) : null}
            <AITranslateAction text={data?.summary} onTranslate={translate} />
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
