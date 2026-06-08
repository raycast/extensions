import { ActionPanel, List, Action, Icon, getPreferenceValues } from "@raycast/api"
import { usePromise } from "@raycast/utils"
import { useRef } from "react"
import { bangumi, SubjectCollectionType, SubjectType } from "@/api/bangumi"
import { getCollectionTag } from "@/utils"
import ProgressViewer from "./ProgressViewer"
import SubjectDetail from "./SubjectDetail"
import { CollectionStatusActions, OpenInBgmBrowser } from "./actions"

const preferences = getPreferenceValues<Preferences>()

const enabledTypes = new Set<SubjectType>(
  [
    preferences.showBook && SubjectType.Book,
    preferences.showAnime && SubjectType.Anime,
    preferences.showMusic && SubjectType.Music,
    preferences.showGame && SubjectType.Game,
    preferences.showReal && SubjectType.Real,
  ].filter(Boolean) as SubjectType[]
)

const PAGE_SIZE = 20

interface CollectionListProps {
  filterType?: SubjectCollectionType
}

export default function CollectionList({ filterType }: CollectionListProps) {
  const abortControllerRef = useRef<AbortController>(null)

  const { data, isLoading, pagination, mutate } = usePromise(
    () => async (options: { page: number }) => {
      const offset = options.page * PAGE_SIZE
      const { data, total } = await bangumi.getMyCollections(
        { limit: PAGE_SIZE, offset, type: filterType },
        abortControllerRef.current?.signal
      )
      return {
        data,
        hasMore: offset + PAGE_SIZE < total,
      }
    },
    [],
    { abortable: abortControllerRef }
  )

  const safePagination = pagination
    ? {
        ...pagination,
        onLoadMore: () => {
          if (!pagination.hasMore) return
          pagination.onLoadMore()
        },
      }
    : undefined

  return (
    <List isLoading={isLoading} pagination={safePagination}>
      {data
        ?.filter((item) => enabledTypes.has(item.subject_type))
        .map((item) => (
          <List.Item
            key={item.subject_id}
            icon={item.subject?.images.common || Icon.Bird}
            title={item.subject?.name_cn || item.subject?.name || `Subject ${item.subject_id}`}
            subtitle={item.subject?.name_cn ? item.subject?.name || "" : ""}
            accessories={[{ tag: getCollectionTag(item.type, item.subject_type) }]}
            actions={
              <ActionPanel title={`${item.subject?.name_cn || item.subject?.name}`}>
                <ActionPanel.Section>
                  {item.subject_type === SubjectType.Anime && (
                    <Action.Push
                      title="View Progress"
                      icon={Icon.BarChart}
                      target={
                        <ProgressViewer
                          subjectId={item.subject_id}
                          subjectName={item.subject?.name}
                          subjectNameCn={item.subject?.name_cn}
                          epStatus={item.ep_status}
                          totalEps={item.subject?.eps || 0}
                        />
                      }
                    />
                  )}
                  <Action.Push
                    title="Show Details"
                    icon={Icon.Sidebar}
                    target={<SubjectDetail subjectId={item.subject_id} />}
                  />
                  <OpenInBgmBrowser path={`subject/${item.subject_id}`} />
                </ActionPanel.Section>
                <CollectionStatusActions
                  subjectId={item.subject_id}
                  currentStatus={item.type}
                  onStatusChange={mutate}
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  )
}
