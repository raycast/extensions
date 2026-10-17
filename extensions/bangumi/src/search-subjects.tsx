import { Action, ActionPanel, Icon, List, LaunchProps } from "@raycast/api"
import { usePromise, withAccessToken } from "@raycast/utils"
import { useRef, useState } from "react"
import { SubjectType, SubjectTypeName } from "@/shared/const"
import { getSubjectDisplay } from "@/shared/utils"
import { SubjectDetail } from "@/components/details"
import { OpenInBgmBrowser } from "@/components/actions"
import { bangumi, bangumiAuth } from "@/api"

// Max to 20
const PAGE_SIZE = 20

const SearchSubjects = (props: LaunchProps<{ arguments: Arguments.SearchSubjects }>) => {
  const [searchText, setSearchText] = useState(props.arguments.keyword || "")
  const [subjectType, setSubjectType] = useState<SubjectType>(SubjectType.Anime)
  const abortable = useRef<AbortController>(null)

  const { data, isLoading, pagination } = usePromise(
    (text: string, type: SubjectType) => async (options: { page: number }) => {
      if (!text) {
        return { data: [], hasMore: false }
      }
      const offset = options.page * PAGE_SIZE
      const { data, total } = await bangumi.searchSubjects({
        keyword: text,
        limit: PAGE_SIZE,
        offset,
        subjectType: type,
        signal: abortable.current?.signal,
      })
      return {
        data,
        hasMore: offset + PAGE_SIZE < total,
      }
    },
    [searchText, subjectType],
    { abortable }
  )

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search subjects by keyword..."
      throttle
      pagination={pagination}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Category"
          value={subjectType.toString()}
          onChange={(newValue) => setSubjectType(parseInt(newValue) as SubjectType)}
        >
          {[SubjectType.Anime, SubjectType.Book, SubjectType.Music, SubjectType.Game, SubjectType.Real].map((type) => (
            <List.Dropdown.Item key={type} title={SubjectTypeName[type]} value={type.toString()} />
          ))}
        </List.Dropdown>
      }
    >
      {searchText === "" ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="Type something to search Bangumi" />
      ) : (
        data?.map((subject) => {
          const { title, subtitle } = getSubjectDisplay(subject.name, subject.name_cn, "Unknown")

          return (
            <List.Item
              key={subject.id}
              title={title}
              subtitle={subtitle}
              icon={
                subject.images?.common || {
                  source: Icon.Image,
                  tintColor: "#969696",
                }
              }
              accessories={[
                ...(subject.date ? [{ tag: subject.date }] : []),
                { icon: Icon.Star, text: subject.rating?.score ? subject.rating.score.toFixed(1) : "N/A" },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Show Details"
                    icon={Icon.Sidebar}
                    target={<SubjectDetail subjectId={subject.id} />}
                  />
                  <OpenInBgmBrowser path={`subject/${subject.id}`} />
                </ActionPanel>
              }
            />
          )
        })
      )}
    </List>
  )
}

export default withAccessToken(bangumiAuth)(SearchSubjects)
