import { closeMainWindow, showHUD } from "@raycast/api";
import { getActiveTabUrl, getFrontmostApp, setActiveTabUrl, UnsupportedBrowserError } from "./lib/browser";
import { findSiteForUrl, loadSites } from "./lib/sites";
import { builderUrl, findPost, liveUrl } from "./lib/wordpress";

/** Resolves a wp-admin post editor URL (post.php?post=123) to the post's Bricks builder URL. */
async function resolveAdminUrl(url: URL): Promise<string | undefined> {
  const postId = Number(url.searchParams.get("post"));
  if (!url.pathname.endsWith("/wp-admin/post.php") || !postId) return undefined;
  const site = findSiteForUrl(await loadSites(), url);
  if (!site) throw new Error(`Add ${url.host} under Manage Bricks Sites to open admin pages in Bricks`);
  const post = await findPost(site, postId);
  if (!post) throw new Error(`Couldn't find post ${postId} on ${site.name}`);
  return post.builderUrl;
}

export default async function Command() {
  await closeMainWindow();
  try {
    const browser = await getFrontmostApp();
    const current = new URL(await getActiveTabUrl(browser));

    if (current.searchParams.get("bricks") === "run") {
      await setActiveTabUrl(browser, liveUrl(current.toString()));
      await showHUD("Opened live page");
      return;
    }

    const target = (await resolveAdminUrl(current)) ?? builderUrl(current.toString());
    await setActiveTabUrl(browser, target);
    await showHUD("Opening in Bricks");
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : String(error);
    if (error instanceof UnsupportedBrowserError) {
      await showHUD(message);
    } else if (/-1743|not authori[sz]ed/i.test(message)) {
      await showHUD("Allow Raycast to control your browser in System Settings › Privacy & Security › Automation");
    } else {
      await showHUD(`Couldn't open in Bricks: ${message}`);
    }
  }
}
