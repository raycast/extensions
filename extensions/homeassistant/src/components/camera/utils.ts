import { ha } from "@lib/common";
import { State } from "@lib/haapi";
import afs from "fs/promises";

export function getVideoStreamUrlFromCamera(state: State): string | undefined {
  const access_token = state.attributes.access_token as string | undefined;
  if (!access_token) {
    return;
  }
  const url = ha.urlJoin(`api/camera_proxy_stream/${state.entity_id}?token=${access_token}`);
  return url;
}

export async function fileToBase64Image(filename: string): Promise<string> {
  const buff = await afs.readFile(filename);
  const base64data = buff.toString("base64");
  return `data:image/jpeg;base64,${base64data}`;
}
