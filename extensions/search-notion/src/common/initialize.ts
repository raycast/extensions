import { preferences } from "@raycast/api";

export async function initialize(): Promise<{
  cookie: string;
  spaceID: string;
}> {
  const cookie = preferences.cookie?.value as
    | string
    | undefined;
  if (!cookie) {
    throw new Error("no cookie");
  }
  const spaceID = preferences.spaceID?.value as
    | string
    | undefined;
  if (!spaceID) {
    throw new Error("no spaceID");
  }
  return { cookie, spaceID };
}
