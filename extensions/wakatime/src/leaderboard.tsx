import { List } from "@raycast/api";

import { useLeaderBoard } from "./hooks";
import { LeaderBoardItem } from "./components";
import { useState } from "react";

export default function Command() {
  const { data, isLoading } = useLeaderBoard();
  const [showDetail, setShowDetail] = useState(false);

  return (
    <List isLoading={isLoading} isShowingDetail={showDetail}>
      {data?.data.map((item, idx) => (
        <LeaderBoardItem key={idx} {...item} {...{ showDetail, setShowDetail }} />
      ))}
    </List>
  );
}
