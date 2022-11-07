import { ActionPanel, Action, List, Detail } from "@raycast/api";
import { CWMessageMgr } from "./components/CWMessageMgr";
import { useEffect, useState } from "react";
import { getRooms, getMessagesOfAllRooms } from "./utils/chatwork-api";
import { Constants } from "./utils/constants";

export default function Command() {
  const [CWMessageMgr, setCWMessageMgr] = useState<CWMessageMgr[]>();
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    async function DoGetMsgs() {
      try {
        const rms = await getRooms();
        const cWMessageMgr = [];
        cWMessageMgr.push(await getMessagesOfAllRooms(rms));
        setCWMessageMgr(cWMessageMgr);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    }
    DoGetMsgs();
  }, []);

  function DetailOfChat(props: { roomName: string; contents: string; link: string }) {
    function getMarkDonw(roomName: string, contents: string) {
      return `
# ${props.roomName}
# ${props.contents}
`;
    }
    return (
      <Detail
        markdown={getMarkDonw(props.roomName, props.contents)}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open in Chatwork" url={props.link} />
            <Action.CopyToClipboard title="Copy URL" content={props.link} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={isLoading}>
      {(() => {
        if (!CWMessageMgr?.length) {
          // there's nothongs to do
          return;
        }
        if (CWMessageMgr?.length !== 1) {
          // there's nothongs to do : length of CWMessageMgr should be 1`
          return;
        }

        const arrs = [];
        for (let i = 0; i < CWMessageMgr[0].CWRooms.length; i++) {
          arrs.push(
            <List.Section
              key={CWMessageMgr[0].CWRooms[i].CWRoom.room_id}
              title={CWMessageMgr[0].CWRooms[i].CWRoom.name}
            >
              {CWMessageMgr[0].CWRooms[i].CWMessage.map((msg) => (
                <List.Item
                  key={msg.message_id}
                  title={msg.body}
                  actions={
                    <ActionPanel>
                      <Action.Push
                        title="Read in Detail"
                        target={
                          <DetailOfChat
                            roomName={CWMessageMgr[0].CWRooms[i].CWRoom.name}
                            contents={msg.body}
                            link={Constants.getCWAppLinkUrl(CWMessageMgr[0].CWRooms[i].CWRoom.room_id, msg.message_id)}
                          />
                        }
                      />
                      <Action.OpenInBrowser
                        title="Open in Chatwork"
                        url={Constants.getCWAppLinkUrl(CWMessageMgr[0].CWRooms[i].CWRoom.room_id, msg.message_id)}
                      />
                      <Action.CopyToClipboard
                        title="Copy URL"
                        content={Constants.getCWAppLinkUrl(CWMessageMgr[0].CWRooms[i].CWRoom.room_id, msg.message_id)}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          );
        }
        return arrs;
      })()}
    </List>
  );
}
