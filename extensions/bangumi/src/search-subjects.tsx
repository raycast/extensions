import { Action, ActionPanel, Icon, List, LaunchProps } from "@raycast/api"
import { usePromise, withAccessToken } from "@raycast/utils"
import { useRef, useState } from "react"
import { bangumi } from "@/api/bangumi"
import { SubjectType, SubjectTypeName } from "@/const"
import { bangumiAuth } from "@/api/oauth"
import SubjectDetail from "@/components/SubjectDetail"
import { OpenInBgmBrowser } from "@/components/actions"

const PAGE_SIZE = 30

interface SearchArguments {
  keyword?: string
}

const SearchSubjects = (props: LaunchProps<{ arguments: SearchArguments }>) => {
  const [searchText, setSearchText] = useState(props.arguments.keyword || "")
  const [subjectType, setSubjectType] = useState<SubjectType>(SubjectType.Anime)
  const abortable = useRef<AbortController>(null)

  const { data, isLoading, pagination } = usePromise(
    (text: string, type: SubjectType) => async (options: { page: number }) => {
      if (!text) {
        return { data: [], hasMore: false }
      }
      const offset = options.page * PAGE_SIZE
      const response = await bangumi.searchSubjects(text, PAGE_SIZE, offset, type, abortable.current?.signal)
      return {
        data: response?.data || [],
        hasMore: offset + PAGE_SIZE < (response?.total || 0),
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
        data?.map((subject) => (
          <List.Item
            key={subject.id}
            title={subject.name_cn || subject.name || "Unknown"}
            subtitle={subject.name}
            icon={subject.images?.common || Icon.Image}
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
        ))
      )}
    </List>
  )
}

export default withAccessToken(bangumiAuth)(SearchSubjects)
