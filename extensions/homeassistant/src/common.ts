import {
    preferences,
} from "@raycast/api";
import { Connection, createConnection, createLongLivedTokenAuth } from "home-assistant-js-websocket";
import { HomeAssistant } from "./haapi";
import { createSocket } from "./socket";

export function createHomeAssistantClient(): HomeAssistant {
    const instance = preferences.instance?.value as string;
    const token = preferences.token?.value as string;
    const ha = new HomeAssistant(instance, token);
    return ha;
}

let con: Connection;

export async function getHAWSConnection(): Promise<Connection> {
    if (con) {
        console.log("return existing ws con");
        return con;
    } else {
        console.log("create new home assistant ws con");
        const instance = preferences.instance?.value as string;
        const token = preferences.token?.value as string;
        const ignoreCertificates = (preferences.ignorecerts.value as boolean) || false;
        const auth = createLongLivedTokenAuth(instance, token);
        con = await createConnection({ auth, createSocket: async () => createSocket(auth, ignoreCertificates) });
        return con;
    }
}
