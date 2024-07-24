import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import { RoomUser } from "@liveblocks/node";

import { getActiveUsers } from "../api";

export default function Command({ roomId }: { roomId: string }) {
  const [loading, setLoading] = useState(true);
  const [activeUsers, setActiveUsers] = useState<RoomUser[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await getActiveUsers(roomId);

      setActiveUsers(data);
      setLoading(false);
    };

    fetchData();
  }, []);

  console.log(activeUsers);
  return (
    <List isLoading={loading} isShowingDetail>
      {activeUsers.length === 0 && (
        <List.EmptyView title="No active users" description="There are no active users in this room" />
      )}

      {activeUsers.map((activeUser, index) => (
        <List.Item
          key={index}
          title={`${activeUser.id}`}
          subtitle={activeUser.type}
          detail={
            <List.Item.Detail
              markdown={`${JSON.stringify(activeUser.info)}`}
              metadata={
                <List.Item.Detail.Metadata>
                  {Object.values(activeUser.info ?? []).map((info, index) => {
                    const key = Object.keys(activeUser.info ?? [])[index];
                    const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);

                    return (
                      <List.Item.Detail.Metadata.Label
                        key={index}
                        title={capitalizedKey}
                        text={info?.toString() ?? ""}
                      />
                    )
                  })}
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
}
