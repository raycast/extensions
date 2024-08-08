import { ActionPanel, Action, Detail } from "@raycast/api";
import { useEffect, useState } from "react";

import { getYjsDocumentAsBinaryUpdate } from "../api";

export default function Command({ roomId }: { roomId: string }) {
  const [loading, setLoading] = useState(true);
  const [roomDocument, setRoomDocument] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      const arrayBuffer = await getYjsDocumentAsBinaryUpdate(roomId);
      const data = new Uint8Array(arrayBuffer).toString();

      setRoomDocument(data);
      setLoading(false);
    };

    fetchData();
  }, []);

  return (
    <Detail
      isLoading={loading}
      markdown={JSON.stringify(roomDocument)}
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
