import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

export interface preferences {
  api_id: string;
  api_hash: string;
}

let SESSION: StringSession;

// TODO: Add a client disconnect function
const { api_id, api_hash } = getPreferenceValues<preferences>();
export const returnClient = async () => {
  try {
    const session = await getSession();
    SESSION = new StringSession(session);
    console.log("creating a new client...");
    return new TelegramClient(SESSION, parseInt(api_id), api_hash, { connectionRetries: 5 });
  } catch (error) {
    console.error("Error creating a new client: ", error);
    throw error;
  }
};

export async function getSession() {
  try {
    const session = await LocalStorage.getItem<string>("session");
    return session ? JSON.parse(session) : "";
  } catch (error) {
    console.error("Error getting session: ", error);
    throw error;
  }
}
