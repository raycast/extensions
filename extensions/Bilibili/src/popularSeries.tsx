import { NoLoginView, Video } from "./components";
import { checkLogin, formatNumber, secondToDate } from "./utils";
import { usePopularSeriesList, usePopularSeriesVideos } from "./hooks";

import { List, ActionPanel, Action, useNavigation } from "@raycast/api";

export default function Command() {
  if (!checkLogin()) return <NoLoginView />;

  const { push } = useNavigation();
  const { popularSeriesList, isLoading } = usePopularSeriesList();

  return (
    <List isLoading={isLoading}>
      {popularSeriesList?.map((item) => (
        <List.Item
          title={item.name}
          subtitle={item.subject}
          actions={
            <ActionPanel>
              <Action onAction={() => push(<PopularSeriesVideos number={item.number} />)} title={"View Details"} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function PopularSeriesVideos(props: { number: number }) {
  const { popularSeriesVideos, isLoading } = usePopularSeriesVideos(props.number);

  return (
    <List enableFiltering={false} isLoading={isLoading} isShowingDetail={true}>
      {popularSeriesVideos?.map((item) => (
        <Video
          title={item.title}
          cover={item.pic}
          url={item.short_link || item.short_link_v2}
          uploader={{
            mid: item.owner.mid,
            name: item.owner.name,
            face: item.owner.face,
          }}
          duration={secondToDate(item.duration)}
          pubdate={item.pubdate}
          stat={{
            highlight: item.rcmd_reason.content,
            view: formatNumber(item.stat.view),
            danmaku: formatNumber(item.stat.danmaku),
            coin: formatNumber(item.stat.coin),
            like: formatNumber(item.stat.like),
          }}
        />
      ))}
    </List>
  );
}
