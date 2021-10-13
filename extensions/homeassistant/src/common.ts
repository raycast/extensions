import {
    preferences,
} from "@raycast/api";
import { HomeAssistant } from "./haapi";

export function createHomeAssistantClient() {
    const instance = preferences.instance?.value as string;
    const token = preferences.token?.value as string;
    const ha = new HomeAssistant(instance, token);
    return ha;
}