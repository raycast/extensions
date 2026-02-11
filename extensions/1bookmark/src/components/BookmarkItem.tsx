import { Icon, List } from "@raycast/api";
import { BookmarkItemActionPanel } from "./BookmarkItemActionPanel";
import { RouterOutputs } from "../utils/trpc.util";
import { getFavicon } from "@raycast/utils";
import { useMemo } from "react";
import { RankingEntries } from "../types";

export const BookmarkItem = (props: {
  bookmark: RouterOutputs["bookmark"]["listAll"][number];
  me?: RouterOutputs["user"]["me"];
  refetch: () => void;
  rankingEntries: RankingEntries;
  setRankingEntries: (rankingEntries: RankingEntries | ((prev: RankingEntries) => RankingEntries)) => void;
}) => {
  const { bookmark, me, refetch, rankingEntries, setRankingEntries } = props;
  const { name, url, spaceId, tags } = bookmark;
  const space = me?.associatedSpaces.find((s) => s.id === spaceId);

  const icon = useMemo(() => {
    try {
      return getFavicon(url);
    } catch (e) {
      return Icon.Bird;
    }
  }, [url]);

  const tagItems = useMemo(() => {
    if (tags.length < 3) {
      return tags;
    }

    return [...tags.slice(0, 2), `+${tags.length - 2}`];
  }, [tags]);

  return (
    <List.Item
      icon={icon}
      title={name}
      subtitle={url.replace(/^https?:\/\//, "")}
      accessories={[
        ...tagItems.map((tag) => ({ tag })),
        { icon: space?.image || (space?.type === "PERSONAL" ? Icon.Person : Icon.TwoPeople) },
      ]}
      actions={
        <BookmarkItemActionPanel
          bookmark={bookmark}
          refetch={refetch}
          rankingEntries={rankingEntries}
          setRankingEntries={setRankingEntries}
        />
      }
    />
  );
};
