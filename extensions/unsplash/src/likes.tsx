import { useMemo, useState } from "react";
import { Grid } from "@raycast/api";
import { getGridColumns, showImageTitle, toTitleCase } from "@/functions/utils";
import { useLikes } from "@/hooks/useLikes";
import { useSetupAuth } from "@/hooks/useSetupAuth";
import Actions from "@/components/Actions";
import OAuthSetupGuide from "@/components/OAuthSetupGuide";
import { SearchResult } from "@/types";

export default function UnsplashLikes() {
  const auth = useSetupAuth();

  if (auth.status === "loading") return <Grid isLoading />;
  if (auth.status === "needs-setup")
    return <OAuthSetupGuide onConnect={auth.connect} connectError={auth.connectError} />;

  return <LikesGrid />;
}

function LikesGrid() {
  const { loading, likes } = useLikes();
  const [unliked, setUnliked] = useState<string[]>([]);

  const filteredLikes = useMemo(
    () => likes?.filter((like) => !unliked.includes(String(like.id))) ?? [],
    [unliked, likes],
  );

  return (
    <Grid isLoading={loading} columns={getGridColumns()} searchBarPlaceholder="Search your likes...">
      <Grid.EmptyView icon="empty-states-photos.png" />
      <Grid.Section title="Results" subtitle={String(filteredLikes.length)}>
        {filteredLikes.map((like) => (
          <LikeGridItem key={like.id} item={like} unlike={setUnliked} />
        ))}
      </Grid.Section>
    </Grid>
  );
}

function LikeGridItem({
  item,
  unlike,
}: {
  item: SearchResult;
  unlike: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const title = item.description || item.alt_description || item.user.name || "No Name";
  const image = item.urls.thumb || item.urls.small || item.urls.regular;
  return (
    <Grid.Item
      content={image}
      title={showImageTitle() ? toTitleCase(title) : ""}
      actions={<Actions item={item} unlike={unlike} details />}
    />
  );
}
