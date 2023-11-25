import fetch, { Headers } from "node-fetch";
import { authorize } from "./oauth";
import { CWMessage } from "../model/CWMessage";
import { CWChatParserV1 } from "../model/CWChatParserV1";
import { CWRoom } from "../model/CWRoom";
import { CMRoomOwner } from "../model/CMRoomOwner";
import { CWMessageMgr } from "../model/CWMessageMgr";
import { Constants } from "../utils/constants";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../model/Preferences";

const preferences: Preferences = getPreferenceValues();

let headers = new Headers({
  accept: "application/json",
});

/**
 * authorize CW API
 *
 * @param _headers
 * @returns headr with the token
 */
async function authorizeApi(_headers: Headers) {
  if (preferences.useChatworkApiKey) {
    _headers.append("x-chatworktoken", `${preferences.chatworkApiKey}`);
    return _headers;
  } else {
    const token = await authorize();
    _headers.append("authorization", `Bearer ${token}`);
    return _headers;
  }
}

/**
 *  get all the rooms the user joined
 *
 * @returns all the rooms the user joined
 */
export async function getRooms(): Promise<CWRoom[]> {
  try {
    headers = await authorizeApi(headers);
    const response = await fetch(`${Constants.CW_API_URL}rooms`, {
      method: "get",
      headers: headers,
    });

    if (response.status !== 200) {
      throw new Error(`fetch is failed. ${response.status}: ${response.statusText}`);
    }

    const rooms: any = await response.json();
    const rooms_obj: CWRoom[] = [];
    rooms.forEach((room: any) => {
      rooms_obj.push(room as CWRoom);
    });
    return rooms_obj;
  } catch (error) {
    throw new Error(error as string);
  }
}

/**
 * get the latest 100 chats from the specified room the user joined
 
 * @param roomId
 * @param isForce
 * @returns
 */
export async function getMessages(roomId: string, isForce = true): Promise<CWMessage[]> {
  try {
    await authorizeApi(headers);
    const url = `${Constants.CW_API_URL}rooms/${roomId}/messages?force=${isForce == true ? "1" : "0"}`;
    const response = await fetch(url, {
      method: "get",
      headers: headers,
    });

    if (response.status !== 200 && response.status !== 204) {
      throw new Error(`fetch is failed. ${response.status}: ${response.statusText}`);
    }

    const messages_obj: CWMessage[] = [];
    if (response.status === 204) {
      return messages_obj;
    }

    const messages: any = await response.json();
    messages.forEach((message: any) => {
      const cwmsg: CWMessage = new CWMessage(new CWChatParserV1());
      cwmsg.copyValueFromJson(message as CWMessage);
      if (cwmsg.body !== "") {
        messages_obj.push(cwmsg);
      }
    });

    return messages_obj;
  } catch (error) {
    throw new Error(error as string);
  }
}

/**
 * get messages through all the room
 *
 * @param CWRooms
 * @returns
 */
export async function getMessagesOfAllRooms(CWRooms: CWRoom[]): Promise<CWMessageMgr> {
  try {
    await authorizeApi(headers);
    const rooms: CMRoomOwner[] = [];
    for (let i = 0; i < CWRooms.length; i++) {
      const ret = await getMessages(String(CWRooms[i].room_id));
      if (ret.length > 0) {
        rooms.push(new CMRoomOwner(CWRooms[i], ret));
      }
    }
    return new CWMessageMgr(rooms);
  } catch (error) {
    throw new Error(error as string);
  }
}
