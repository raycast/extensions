import { Icon, List } from "@raycast/api";
import { BookmarkItemActionPanel } from "./BookmarkItemActionPanel";
import { BookmarkItemDetail } from "./BookmarkItemDetail";
import { RouterOutputs } from "../utils/trpc.util";
import { useMemo } from "react";
import { RankingEntries } from "../types";
import { resolveSpaceIconUrl } from "../utils/space-icon.util";

export const BookmarkItem = (props: {
  bookmark: RouterOutputs["bookmark"]["listAll"][number];
  me?: RouterOutputs["user"]["me"];
  refetch: () => void;
  rankingEntries: RankingEntries;
  setRankingEntries: (rankingEntries: RankingEntries | ((prev: RankingEntries) => RankingEntries)) => void;
  isShowingDetail: boolean;
  setIsShowingDetail: (next: boolean | ((prev: boolean) => boolean)) => void;
}) => {
  const { bookmark, me, refetch, rankingEntries, setRankingEntries, isShowingDetail, setIsShowingDetail } = props;
  const { name, url, spaceId, tags, faviconUrl } = bookmark;
  const space = me?.associatedSpaces.find((s) => s.id === spaceId);

  const icon = faviconUrl ?? Icon.Link;

  const tagItems = useMemo(() => {
    if (tags.length < 3) {
      return tags;
    }

    return [...tags.slice(0, 2), `+${tags.length - 2}`];
  }, [tags]);

  // Detail 표시 중에는 accessories를 숨겨 좁은 list 컬럼에서 스페이스 확보.
  const accessories = isShowingDetail
    ? undefined
    : [
        ...tagItems.map((tag) => ({ tag })),
        { icon: resolveSpaceIconUrl(space?.image) || (space?.type === "PERSONAL" ? Icon.Person : Icon.TwoPeople) },
      ];

  return (
    <List.Item
      icon={icon}
      title={name}
      subtitle={isShowingDetail ? undefined : url.replace(/^https?:\/\//, "")}
      accessories={accessories}
      detail={isShowingDetail ? <BookmarkItemDetail bookmark={bookmark} me={me} /> : undefined}
      actions={
        <BookmarkItemActionPanel
          bookmark={bookmark}
          refetch={refetch}
          rankingEntries={rankingEntries}
          setRankingEntries={setRankingEntries}
          isShowingDetail={isShowingDetail}
          setIsShowingDetail={setIsShowingDetail}
        />
      }
    />
  );
};
