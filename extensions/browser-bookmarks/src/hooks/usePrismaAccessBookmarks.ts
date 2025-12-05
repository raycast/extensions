import { homedir, platform } from "os";

import { BROWSERS_BUNDLE_ID } from "./useAvailableBrowsers";
import useChromiumBookmarks from "./useChromiumBookmarks";

const isMacOS = platform() === "darwin";

const PRISMA_ACCESS_BOOKMARKS_PATH = isMacOS
  ? `${homedir()}/Library/Application Support/PAB/Prisma Access Browser`
  : `${homedir()}\\AppData\\Local\\PAB\\Prisma Access Browser\\User Data`;

export default function usePrismaAccessBookmarks(enabled: boolean) {
  return useChromiumBookmarks(enabled, {
    path: PRISMA_ACCESS_BOOKMARKS_PATH,
    browserName: "Prisma Access",
    browserIcon: "prisma-access.png",
    browserBundleId: BROWSERS_BUNDLE_ID.prismaAccess,
  });
}
