import { ActionPanel, Action, List, Detail, Icon } from "@raycast/api";
import { CWMessageMgr } from "./model/CWMessageMgr";
import { CWRoom } from "./model/CWRoom";
import { useEffect, useState } from "react";
import { getRooms } from "./utils/chatwork-api";
import { Constants } from "./utils/constants";

export default function CommandToSearchRooms() {
  const [CWRooms, setCWRooms] = useState<CWRoom[]>([]);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    async function DoGetRooms() {
      try {
        const rms: CWRoom[] = await getRooms();
        setCWRooms(rms);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    }
    DoGetRooms();
  }, []);

  return (
    <List isLoading={isLoading}>
      {(() => {
        if (!CWRooms?.length) {
          // there's nothongs to do
          return;
        }

        const arrs = [];
        for (let i = 0; i < CWRooms.length; i++) {
          arrs.push(
            <List.Item
              key={CWRooms[i].room_id}
              title={CWRooms[i].name}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Open in Chatwork"
                    url={Constants.getCWAppLinkUrlForRoom(CWRooms[i].room_id)}
                  />
                  <Action.CopyToClipboard
                    title="Copy URL"
                    content={Constants.getCWAppLinkUrlForChat(CWRooms[i].room_id, "")}
                  />
                </ActionPanel>
              }
            />
          );
        }
        return arrs;
      })()}
    </List>
  );
}
