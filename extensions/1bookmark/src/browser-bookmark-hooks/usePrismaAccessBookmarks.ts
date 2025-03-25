import { homedir } from "os";

import { BROWSERS_BUNDLE_ID } from "./useAvailableBrowsers";
import useChromiumBookmarks from "./useChromiumBookmarks";

const PRISMA_ACCESS_BOOKMARKS_PATH = `${homedir()}/Library/Application Support/PAB/Prisma Access Browser`;

export default function usePrismaAccessBookmarks(enabled: boolean) {
  return useChromiumBookmarks(enabled, {
    path: PRISMA_ACCESS_BOOKMARKS_PATH,
    browserName: "Prisma Access",
    browserIcon: "prisma-access.png",
    browserBundleId: BROWSERS_BUNDLE_ID.prismaAccess,
  });
}
