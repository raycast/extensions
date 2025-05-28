import { ActionPanel, Action, Detail } from "@raycast/api";
import { JsonObject } from "@liveblocks/node";
import { useEffect, useState } from "react";

import { getYjsDocument } from "../api";

export default function Command({ roomId }: { roomId: string }) {
  const [loading, setLoading] = useState(true);
  const [roomStorage, setRoomStorage] = useState<JsonObject>({});

  useEffect(() => {
    const fetchData = async () => {
      const data = await getYjsDocument(roomId);

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
