import { ActionPanel, List, Action, Icon, getPreferenceValues } from "@raycast/api"
import { usePromise } from "@raycast/utils"
import { useRef, useState } from "react"
import { SubjectCollectionType, SubjectType, SubjectTypeName } from "@/shared/const"
import { getCollectionTag, getSubjectDisplay } from "@/shared/utils"
import { ProgressGrid } from "@/components/lists"
import { SubjectDetail } from "@/components/details"
import { CollectionStatusActions, OpenInBgmBrowser } from "@/components/actions"
import { bangumi } from "@/api"

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

interface CollectionSubjectListProps {
  filterType?: SubjectCollectionType
}

export default function CollectionSubjectList({ filterType }: CollectionSubjectListProps) {
  const [subjectType, setSubjectType] = useState<string>("all")
  const abortControllerRef = useRef<AbortController>(null)

  const { data, isLoading, pagination, mutate } = usePromise(
    (subjectType: string) => async (options: { page: number }) => {
      const offset = options.page * PAGE_SIZE
      const { data, total } = await bangumi.getMyCollections({
        query: {
          limit: PAGE_SIZE,
          offset,
          type: filterType,
          ...(subjectType !== "all" && { subject_type: parseInt(subjectType) }),
        },
        signal: abortControllerRef.current?.signal,
      })
      return {
        data,
        hasMore: offset + PAGE_SIZE < total,
      }
    },
    [subjectType],
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
    <List
      isLoading={isLoading}
      pagination={safePagination}
      searchBarAccessory={
        <List.Dropdown tooltip="Select Category" value={subjectType} onChange={setSubjectType}>
          <List.Dropdown.Item title="All" value="all" />
          {Array.from(enabledTypes).map((type) => (
            <List.Dropdown.Item key={type} title={SubjectTypeName[type]} value={type.toString()} />
          ))}
        </List.Dropdown>
      }
    >
      {data
        ?.filter((item) => enabledTypes.has(item.subject_type))
        .map((item) => {
          const { title, subtitle } = getSubjectDisplay(
            item.subject?.name,
            item.subject?.name_cn,
            `Subject ${item.subject_id}`
          )

          return (
            <List.Item
              key={item.subject_id}
              icon={item.subject?.images.common || Icon.Bird}
              title={title}
              subtitle={subtitle}
              accessories={[{ tag: getCollectionTag(item.type, item.subject_type) }]}
              keywords={[getCollectionTag(item.type, item.subject_type).value]}
              actions={
                <ActionPanel title={title}>
                  <ActionPanel.Section>
                    <Action.Push
                      title="Show Details"
                      icon={Icon.Sidebar}
                      target={<SubjectDetail subjectId={item.subject_id} />}
                    />
                    {item.subject_type === SubjectType.Anime && (
                      <Action.Push
                        title="View Progress"
                        icon={Icon.BarChart}
                        target={
                          <ProgressGrid
                            subjectId={item.subject_id}
                            subjectName={item.subject?.name}
                            epStatus={item.ep_status}
                            totalEps={item.subject?.eps}
                          />
                        }
                      />
                    )}
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
          )
        })}
    </List>
  )
}
