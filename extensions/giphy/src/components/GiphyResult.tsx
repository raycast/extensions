import { normalizeTitle } from "../utils/giphy";
import GIFActions from "./GIFActions";
import { Action, ActionPanel, Grid } from "@raycast/api";
import useGiphy from "../hooks/useGiphy";

function GiphyResult() {
  const {
    state: { loading, searchText, gifs, recents },
    pageNumber,
    prev,
    next,
    onView,
  } = useGiphy();

  return (
    <>
      {!searchText && (
        <Grid.Section title="Recent">
          {Object.values(recents)
            .slice(-5)
            .reverse()
            .map((recentItem) => (
              <Grid.Item
                key={recentItem.id}
                content={{
                  value: { source: recentItem.images.preview_gif.url },
                  tooltip: recentItem.title,
                }}
                title={normalizeTitle(recentItem.title)}
                subtitle={recentItem.username}
                actions={<GIFActions gif={recentItem} />}
              />
            ))}
        </Grid.Section>
      )}

      <Grid.Section
        title={
          searchText
            ? `GIF results for "${searchText}"   |   Page: ${pageNumber}   |   Total results: ${gifs?.pagination.total_count}`
            : `Trending`
        }
      >
        {!loading && !!gifs?.data.length && (
          <>
            {gifs.data.map((item) => (
              <Grid.Item
                key={item.id}
                content={{
                  value: { source: item.images.preview_gif.url },
                  tooltip: item.title,
                }}
                title={normalizeTitle(item.title)}
                subtitle={item.username}
                actions={<GIFActions onView={onView} gif={item} />}
              />
            ))}
            {!!searchText && (
              <>
                <Grid.Item
                  key={`prev-page`}
                  content={{
                    value: { source: { dark: "arrow-left-dark.svg", light: "arrow-left-light.svg" } },
                    tooltip: "Previous Page",
                  }}
                  title={"Previous Page"}
                  actions={
                    <ActionPanel>
                      <Action
                        icon={{ source: { dark: "arrow-left-dark.svg", light: "arrow-left-light.svg" } }}
                        title="Previous Page"
                        onAction={() => prev()}
                      />
                    </ActionPanel>
                  }
                />
                <Grid.Item
                  key={`next-page`}
                  content={{
                    value: { source: { dark: "arrow-right-dark.svg", light: "arrow-right-light.svg" } },
                    tooltip: "Next Page",
                  }}
                  title={"Next Page"}
                  actions={
                    <ActionPanel>
                      <Action
                        icon={{ source: { dark: "arrow-right-dark.svg", light: "arrow-right-light.svg" } }}
                        title="Next Page"
                        onAction={() => next()}
                      />
                    </ActionPanel>
                  }
                />
              </>
            )}
          </>
        )}
      </Grid.Section>
    </>
  );
}

export default GiphyResult;
