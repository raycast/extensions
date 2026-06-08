import { ActionPanel, Detail, Icon } from "@raycast/api"
import { usePromise, withAccessToken } from "@raycast/utils"
import { useRef } from "react"
import { bangumi } from "@/api/bangumi"
import { bangumiAuth } from "@/api/oauth"
import { CollectionStatusActions, OpenInBgmBrowser } from "./actions"
import { getCollectionTag, SubjectCollectionIcon } from "@/const"

interface SubjectDetailProps {
  subjectId: number
}

const SubjectDetail = ({ subjectId }: SubjectDetailProps) => {
  const abortable = useRef<AbortController>(null)
  const collectionAbortable = useRef<AbortController>(null)
  const charactersAbortable = useRef<AbortController>(null)

  const { data, isLoading } = usePromise(
    async (id) => {
      const res = await bangumi.getSubjectById(id, abortable.current?.signal)
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
      const res = await bangumi.getSubjectCollection(id, collectionAbortable.current?.signal)
      return res
    },
    [subjectId],
    { abortable: collectionAbortable }
  )

  const { data: characters, isLoading: isCharactersLoading } = usePromise(
    async (id) => {
      const res = await bangumi.getSubjectCharacters(id, charactersAbortable.current?.signal)
      return res
    },
    [subjectId],
    { abortable: charactersAbortable }
  )

  const coverUrl = data?.images?.large
  const markdown = data
    ? `
${coverUrl ? `<img src="${coverUrl}" width="120%" />` : ""}

# ${data.name_cn || data.name}${
        data.name_cn && data.name && data.name !== data.name_cn ? `\n<sup>${data.name}</sup>` : ""
      }


${data.summary || "No summary available."}

${
  characters && characters.length > 0
    ? `## Voice Actors\n\n${characters
        .slice(0, 10)
        .map((char) => {
          const cvs = char.actors && char.actors.length > 0 ? char.actors.map((a) => a.name).join(", ") : "N/A"
          return `- **${char.name}** (${char.relation}) - CV: ${cvs}`
        })
        .join("\n")}`
    : ""
}
`
    : ""

  return (
    <Detail
      isLoading={isLoading || isCollectionLoading || isCharactersLoading}
      markdown={markdown}
      metadata={
        data ? (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Rating"
              text={data.rating?.score ? `${data.rating.score.toFixed(1)} / 10` : "N/A"}
              icon={Icon.Star}
            />
            {data.rating?.rank && (
              <Detail.Metadata.Label title="Rank" text={`#${data.rating.rank}`} icon={Icon.Trophy} />
            )}
            {data.date && <Detail.Metadata.Label title="Air Date" text={data.date} icon={Icon.Calendar} />}
            <Detail.Metadata.Label
              title="Episodes"
              text={data.eps ? data.eps.toString() : data.total_episodes ? data.total_episodes.toString() : "N/A"}
              icon={Icon.List}
            />
            {data.tags && data.tags.length > 0 && (
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
            <Detail.Metadata.Label title="Doing" text={data.collection?.doing?.toString() || "0"} icon={Icon.Play} />
            <Detail.Metadata.Label title="Wishlist" text={data.collection?.wish?.toString() || "0"} icon={Icon.Heart} />
            <Detail.Metadata.Label
              title="Collected"
              text={data.collection?.collect?.toString() || "0"}
              icon={Icon.Check}
            />
          </Detail.Metadata>
        ) : null
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
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
