import { List } from "@raycast/api";
import { ICWMessage } from "./components/ICWMessage";
import { CWMessageMgr } from "./components/CWMessageMgr";
import { useEffect, useState } from "react";
import { getMessagesOfAllRooms, getRooms, getMessagesOfAllRooms2 } from "./utils/chatwork-api";

export default function Command() {
  const [CWMessages, setCWMessage] = useState<ICWMessage[]>();
  // todo なぜクラスだと設定できないのか(undefinedのままなのか)調査する
  // 仮説：インスタンス参照の問題ではないかと思う。
  const [CWMessageMgr, setCWMessageMgr] = useState<CWMessageMgr[]>();
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    async function DoGetMsgs() {
      try {
        const rms = await getRooms();
        setCWMessage(await getMessagesOfAllRooms(rms));

        const t = [];
        t.push(await getMessagesOfAllRooms2(rms));
        setCWMessageMgr(t);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    }
    DoGetMsgs();
  }, []);
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
                <List.Item key={msg.message_id} title={msg.body}></List.Item>
              ))}
            </List.Section>
          );
        }
        return arrs;
      })()}
    </List>
  );
}
