import { Action, ActionPanel, Icon, LaunchProps, Grid } from "@raycast/api"
import { usePromise, withAccessToken } from "@raycast/utils"
import { useRef, useState } from "react"
import { OpenInBgmBrowser } from "@/components/actions"
import { CharacterDetail } from "@/components/details"
import { bangumi, bangumiAuth } from "@/api"

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
      const res1Promise = bangumi.searchCharacters({
        keyword: text,
        limit: PAGE_SIZE,
        offset: baseOffset,
        signal: abortable.current?.signal,
      })

      const res2Promise = bangumi
        .searchCharacters({
          keyword: text,
          limit: PAGE_SIZE,
          offset: baseOffset + PAGE_SIZE,
          signal: abortable.current?.signal,
        })
        .then((res) => ({ success: true as const, data: res.data }))
        .catch((err) => ({ success: false as const, error: err }))

      const res1 = await res1Promise
      const res2Result = await res2Promise

      let res2Data: typeof res1.data = []
      if (baseOffset + PAGE_SIZE < res1.total) {
        if (!res2Result.success) {
          throw res2Result.error
        }
        res2Data = res2Result.data
      }

      return {
        data: [...res1.data, ...res2Data],
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
        data?.map((character) => (
          <Grid.Item
            key={character.id}
            title={character.name || "Unknown"}
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
        ))
      )}
    </Grid>
  )
}

export default withAccessToken(bangumiAuth)(SearchCharacters)
