import { Fragment, useState } from "react";
import { Action, Color, Icon, List } from "@raycast/api";

import { useLeaderBoard } from "./hooks";
import { LeaderBoardItem } from "./components";

export default function LeaderBoardCommand({ id }: { id?: string }) {
  const [page, setPage] = useState<string>();
  const [showDetail, setShowDetail] = useState(false);

  const { data, error, isLoading } = useLeaderBoard({ id, page: page == undefined ? undefined : +page });

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail}
      selectedItemId={data?.current_user?.page === data?.page ? data?.current_user?.user.id : undefined}
      searchBarAccessory={
        data && (
          <List.Dropdown
            tooltip="Page"
            value={page ?? String(data ? data.page : 1)}
            onChange={(page) => !isLoading && setPage(page)}
          >
            {Array.from({ length: data.total_pages }).map((_, idx) => (
              <List.Dropdown.Item key={idx} title={`Page ${idx + 1}`} value={String(idx + 1)} />
            ))}
          </List.Dropdown>
        )
      }
    >
      {error != undefined && (
        <List.EmptyView title="Failed to Fetch Data" icon={{ source: Icon.Important, tintColor: Color.Red }} />
      )}
      {data?.data.map((item, idx) => (
        <LeaderBoardItem
          key={idx}
          {...item}
          {...{ showDetail, setShowDetail }}
          PageActions={
            <Fragment>
              {data.page > 1 && (
                <Action
                  title="Previous Page"
                  icon={Icon.ArrowLeftCircleFilled}
                  onAction={() => setPage(String(data.page - 1))}
                  shortcut={{ key: "arrowLeft", modifiers: ["shift"] }}
                />
              )}
              {data.page < data.total_pages && (
                <Action
                  title="Next Page"
                  icon={Icon.ArrowRightCircleFilled}
                  onAction={() => setPage(String(data.page + 1))}
                  shortcut={{ key: "arrowRight", modifiers: ["shift"] }}
                />
              )}
            </Fragment>
          }
        />
      ))}
    </List>
  );
}
