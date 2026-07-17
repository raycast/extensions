import { ActionPanel, Action, Detail } from "@raycast/api";
import { useEffect, useState } from "react";

import { getRoomStorage } from "../api";

export default function Command({ roomId }: { roomId: string }) {
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [roomStorage, setRoomStorage] = useState<any>({});

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await getRoomStorage(roomId);

      setRoomStorage(data);
      setLoading(false);
    };

    fetchData();
  }, []);

  return (
    <Detail
      isLoading={loading}
      markdown={JSON.stringify(roomStorage)}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Dashboard"
            url={`https://liveblocks.io/dashboard/rooms/${encodeURIComponent(roomId)}`}
          />
        </ActionPanel>
      }
    />
  );
}
