import { List } from "@raycast/api";

import { useLeaderBoard } from "./hooks";
import { LeaderBoardItem } from "./components";
import { useState } from "react";

export default function Command({ id }: { id?: string }) {
  const { data, isLoading } = useLeaderBoard(id);
  const [showDetail, setShowDetail] = useState(false);

  return (
    <List isLoading={isLoading} isShowingDetail={showDetail} selectedItemId={data?.current_user.user.id}>
      {data?.data.map((item, idx) => (
        <LeaderBoardItem key={idx} {...item} {...{ showDetail, setShowDetail }} />
      ))}
    </List>
  );
}
