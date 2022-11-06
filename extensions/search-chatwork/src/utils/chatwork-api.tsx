import fetch, { Headers } from "node-fetch";
import { authorize } from "./oauth";
import { ICWMessage } from "../components/ICWMessage";
import { ICWRoom } from "../components/ICWRoom";
import { CMRoom } from "../components/CMRoom";
import { CWMessageMgr } from "../components/CWMessageMgr";
import { Constants } from "../utils/constants";

let headers = new Headers({
  accept: "application/json",
});

/**
 * authorize CW Api
 *
 * @param _headers
 * @returns headr with the token
 */
async function authorizeApi(_headers: Headers) {
  const token = await authorize();
  _headers.append("authorization", `Bearer ${token}`);
  return _headers;
}

/**
 *  get all the rooms the user joined
 *
 * @returns all the rooms the user joined
 */
export async function getRooms(): Promise<ICWRoom[]> {
  try {
    headers = await authorizeApi(headers);
    const response = await fetch(`${Constants.CW_API_URL}rooms`, {
      method: "get",
      headers: headers,
    });

    if (response.status !== 200) {
      throw new Error(`fetch is failed. ${response.status}: ${response.statusText}`);
    }

    const rooms = await response.json();
    const rooms_obj: ICWRoom[] = [];
    rooms.forEach((room) => {
      rooms_obj.push(room as ICWRoom);
    });
    return rooms_obj;
  } catch (error) {
    throw new Error(error as string);
  }
}

/**
 * 指定のルームのチャットの上位100件を取得する
 * get the latest 100 chats from the specified room the user joined
 * @param roomId
 * @param isForce
 * @returns
 */
export async function getMessages(roomId: string, isForce = true): Promise<ICWMessage[]> {
  try {
    await authorizeApi(headers);
    const url = `${Constants.CW_API_URL}rooms/${roomId}/messages?force=${isForce == true ? "1" : "0"}`;
    const response = await fetch(url, {
      method: "get",
      headers: headers,
    });

    if (response.status !== 200) {
      throw new Error(`fetch is failed. ${response.status}: ${response.statusText}`);
    }

    const messages = await response.json();
    const messages_obj: ICWMessage[] = [];
    messages.forEach((message) => {
      messages_obj.push(message as ICWMessage);
    });
    return messages;
  } catch (error) {
    throw new Error(error as string);
  }
}

/**
 * Get the latest 100 chats from all the room user join
 *
 * @param CWRooms
 * @returns the latest 100 chats from all the room user join
 */
export async function getMessagesOfAllRooms(CWRooms: ICWRoom[]): Promise<ICWMessage[]> {
  try {
    await authorizeApi(headers);
    let messages_obj: ICWMessage[] = [];
    for (let i = 0; i < CWRooms.length; i++) {
      const ret = await getMessages(String(CWRooms[i].room_id));
      if (ret.length > 0) {
        messages_obj = messages_obj.concat(ret);
      }
    }
    return messages_obj;
  } catch (error) {
    throw new Error(error as string);
  }
}

export async function getMessagesOfAllRooms2(ICWRooms: ICWRoom[]): Promise<CWMessageMgr> {
  try {
    await authorizeApi(headers);
    const rooms: CMRoom[] = [];
    for (let i = 0; i < ICWRooms.length; i++) {
      const ret = await getMessages(String(ICWRooms[i].room_id));
      if (ret.length > 0) {
        rooms.push(new CMRoom(ICWRooms[i], ret));
      }
    }
    return new CWMessageMgr(rooms);
  } catch (error) {
    throw new Error(error as string);
  }
}
