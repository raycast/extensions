import { List } from "@raycast/api";

import { useLeaderBoard } from "./hooks";
import { LeaderBoardItem } from "./components";
import { useState } from "react";

export default function Command({ id }: { id?: string }) {
  const [page, setPage] = useState<string>();
  const [showDetail, setShowDetail] = useState(false);

  const { data, isLoading } = useLeaderBoard({ id, page: page == undefined ? undefined : +page });

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail}
      selectedItemId={data?.current_user?.user.id}
      searchBarAccessory={
        data && (
          <List.Dropdown tooltip="Page" onChange={setPage} value={page ?? String(data ? data.page : 1)}>
            {Array.from({ length: data.total_pages }).map((_, idx) => (
              <List.Dropdown.Item key={idx} title={`Page ${idx + 1}`} value={String(idx + 1)} />
            ))}
          </List.Dropdown>
        )
      }
    >
      {data?.data.map((item, idx) => (
        <LeaderBoardItem key={idx} {...item} {...{ showDetail, setShowDetail }} />
      ))}
    </List>
  );
}
