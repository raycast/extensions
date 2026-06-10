import { Action, ActionPanel, Icon, LaunchProps, Grid } from "@raycast/api"
import { usePromise, withAccessToken } from "@raycast/utils"
import { useRef, useState } from "react"
import { bangumi, Infobox } from "@/api/bangumi"
import { bangumiAuth } from "@/api/oauth"
import { OpenInBgmBrowser } from "@/components/actions"
import CharacterDetail from "@/components/CharacterDetail"

// Max to 20
const PAGE_SIZE = 20

const SearchCharacters = (props: LaunchProps<{ arguments: Arguments.SearchCharacters }>) => {
  const [searchText, setSearchText] = useState(props.arguments.keyword || "")
  const abortable = useRef<AbortController>(null)

  const { data, isLoading, pagination } = usePromise(
    (text: string) => async (options: { page: number }) => {
      if (!text) {
        return { data: [], hasMore: false }
      }
      const baseOffset = options.page * PAGE_SIZE * 2
      const [res1, res2] = await Promise.all([
        bangumi.searchCharacters({
          keyword: text,
          limit: PAGE_SIZE,
          offset: baseOffset,
          signal: abortable.current?.signal,
        }),
        bangumi.searchCharacters({
          keyword: text,
          limit: PAGE_SIZE,
          offset: baseOffset + PAGE_SIZE,
          signal: abortable.current?.signal,
        }),
      ])
      return {
        data: [...res1.data, ...res2.data],
        hasMore: baseOffset + PAGE_SIZE * 2 < res1.total,
      }
    },
    [searchText],
    { abortable }
  )

  return (
    <Grid
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search characters by keyword..."
      throttle
      columns={8}
      pagination={pagination}
    >
      {searchText === "" ? (
        <Grid.EmptyView icon={Icon.MagnifyingGlass} title="Type something to search Characters" />
      ) : (
        data?.map((character) => {
          const infobox = character.infobox as Infobox | undefined
          const nameCnItem = infobox?.find((box) => box.key === "简体中文名")
          const nameCn = nameCnItem && typeof nameCnItem.value === "string" ? nameCnItem.value : ""

          const titleName = nameCn || character.name
          const subtitleName = character.name !== titleName ? character.name : ""

          return (
            <Grid.Item
              key={character.id}
              title={titleName || "Unknown"}
              subtitle={subtitleName}
              content={
                character.images?.grid || {
                  source: Icon.Person,
                  tintColor: "#969696",
                }
              }
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Show Details"
                    icon={Icon.Sidebar}
                    target={<CharacterDetail characterId={character.id} />}
                  />
                  <OpenInBgmBrowser path={`character/${character.id}`} />
                </ActionPanel>
              }
            />
          )
        })
      )}
    </Grid>
  )
}

export default withAccessToken(bangumiAuth)(SearchCharacters)
