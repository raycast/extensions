import fetch, { Headers } from "node-fetch";
import { CWMessage } from "../model/CWMessage";
import { CWChatParserV1 } from "../model/CWChatParserV1";
import { CWRoom } from "../model/CWRoom";
import { CMRoomOwner } from "../model/CMRoomOwner";
import { CWMessageMgr } from "../model/CWMessageMgr";
import { Constants } from "../utils/constants";
import { getPreferenceValues } from "@raycast/api";
import { getAccessToken } from "@raycast/utils";

const preferences = getPreferenceValues<Preferences>();

let headers = new Headers({
  accept: "application/json",
});

/**
 * authorize CW API
 *
 * @param _headers
 * @returns header with the token
 */
function authorizeApi(_headers: Headers) {
  const { token } = getAccessToken();
  if (preferences.useChatworkApiKey) {
    _headers.append("x-chatworktoken", token);
    return _headers;
  } else {
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
    headers = authorizeApi(headers);
    const response = await fetch(`${Constants.CW_API_URL}rooms`, {
      method: "get",
      headers: headers,
    });

    if (response.status !== 200) {
      throw new Error(`fetch is failed. ${response.status}: ${response.statusText}`);
    }

    const rooms = (await response.json()) as CWRoom[];
    const rooms_obj = rooms;
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
    authorizeApi(headers);
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

    const messages = (await response.json()) as CWMessage[];
    messages.forEach((message) => {
      const cwmsg: CWMessage = new CWMessage(new CWChatParserV1());
      cwmsg.copyValueFromJson(message);
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
    authorizeApi(headers);
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

/**
 *  get all the contacts the user has
 *
 * @returns all the contacts the user has
 */
export async function getContacts() {
  type Contact = {
    account_id: number;
    room_id: number;
    name: string;
    chatwork_id: string;
    organization_id: number;
    organization_name: string;
    department: string;
    avatar_image_url: string;
  };

  headers = authorizeApi(headers);
  const response = await fetch(`${Constants.CW_API_URL}contacts`, {
    method: "get",
    headers: headers,
  });

  if (!response.ok) {
    const result = (await response.json()) as { errors: string[] };
    throw new Error(result.errors[0]);
  }
  if (response.status === 204) return [];

  const contacts = (await response.json()) as Contact[];
  return contacts;
}
