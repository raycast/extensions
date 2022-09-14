import { video } from "./components";
import { usePopularSeriesList, usePopularSeriesVideos } from "./hooks";
import { checkLogin, formatNumber, secondToDate } from "./utils";

import { Color, List, Icon, ActionPanel, Action, useNavigation } from "@raycast/api";

export default function Command() {
  if (!checkLogin())
    return (
      <List>
        <List.EmptyView
          icon={{
            source: Icon.ExclamationMark,
            tintColor: Color.Red,
          }}
          title="Please use Login Bilibili command to login first."
        />
      </List>
    );

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
              <Action onAction={() => push(<PopularSeriesVideos number={item.number} />)} title={"View Detail"} />
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
      {popularSeriesVideos?.map((item) =>
        video(
          item.title,
          item.pic,
          item.short_link,
          {
            mid: item.owner.mid,
            name: item.owner.name,
            face: item.owner.face,
          },
          secondToDate(item.duration),
          item.pubdate,
          {
            highlight: item.rcmd_reason.content,
            view: formatNumber(item.stat.view),
            danmaku: formatNumber(item.stat.danmaku),
            coin: formatNumber(item.stat.coin),
            like: formatNumber(item.stat.like),
          }
        )
      )}
    </List>
  );
}
