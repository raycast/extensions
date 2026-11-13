import { Action, ActionPanel, Color, Grid, Icon } from "@raycast/api";
import { FONTSHARE_URL } from "./api";
import PairDetail, { PairActions } from "./pair-detail";
import { PREVIEW_PLACEHOLDER, usePairPreviews } from "./preview";
import { useCatalog } from "./use-catalog";

export default function Command() {
  const {
    pairs: { data: pairs, isLoading, error, revalidate },
    catalog,
  } = useCatalog("pairs");
  const { files: previews, isRendering } = usePairPreviews(pairs);

  return (
    <Grid
      columns={3}
      aspectRatio="3/2"
      fit={Grid.Fit.Contain}
      isLoading={isLoading || isRendering}
      searchBarPlaceholder="Search pairings by font name"
    >
      {error && !pairs ? (
        <Grid.EmptyView
          icon={Icon.ExclamationMark}
          title="Could not load pairings"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <Action.OpenInBrowser title="Open Fontshare" url={FONTSHARE_URL} />
            </ActionPanel>
          }
        />
      ) : (
        <Grid.EmptyView icon={Icon.TwoPeople} title="No pairings found" description="Try a different font name." />
      )}
      {pairs?.map((pair) => (
        <Grid.Item
          key={pair.id}
          title={pair.title}
          subtitle={`${pair.headline.styleName} · ${pair.body.styleName}`}
          keywords={[pair.headline.name, pair.body.name]}
          content={{
            value: previews[pair.id]
              ? { source: previews[pair.id], tintColor: Color.PrimaryText }
              : PREVIEW_PLACEHOLDER,
            tooltip: pair.title,
          }}
          actions={
            <PairActions pair={pair} catalog={catalog}>
              <Action.Push
                title="Show Details"
                icon={Icon.Sidebar}
                target={<PairDetail pair={pair} catalog={catalog} />}
              />
            </PairActions>
          }
        />
      ))}
    </Grid>
  );
}
