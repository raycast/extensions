import { LocalStorage, showHUD, getPreferenceValues } from "@raycast/api";
import { decodeHtmlEntities } from "./utils";
import { BASE_URL, LAST_CHECK_KEY, LAST_NOTIFIED_KEY } from "./constants";

interface Post {
  id: number;
  title: { rendered: string };
}

export default async function Command() {
  const prefs = getPreferenceValues<Preferences>();

  if (!prefs.enableNotifications) return;

  const intervalHours = parseInt(prefs.notificationInterval ?? "1", 10);
  const lastCheckStr = await LocalStorage.getItem<string>(LAST_CHECK_KEY);
  if (lastCheckStr) {
    const hoursSince =
      (Date.now() - new Date(lastCheckStr).getTime()) / 3_600_000;
    if (hoursSince < intervalHours) return;
  }

  await LocalStorage.setItem(LAST_CHECK_KEY, new Date().toISOString());

  const params = new URLSearchParams({
    per_page: "1",
    orderby: "date",
    order: "desc",
  });
  if (prefs.notificationCategory && prefs.notificationCategory !== "0") {
    params.set("categories", prefs.notificationCategory);
  }

  try {
    const res = await fetch(
      `${BASE_URL}/wp-json/wp/v2/posts?${params.toString()}`,
    );
    if (!res.ok) return;

    const posts: Post[] = await res.json();
    if (!posts.length) return;

    const latest = posts[0];
    const lastNotifiedId =
      await LocalStorage.getItem<string>(LAST_NOTIFIED_KEY);

    if (String(latest.id) !== lastNotifiedId) {
      await LocalStorage.setItem(LAST_NOTIFIED_KEY, String(latest.id));
      if (lastNotifiedId) {
        const title = decodeHtmlEntities(latest.title.rendered).substring(
          0,
          60,
        );
        await showHUD(`Nowy wpis na Dailyweb: ${title}`);
      }
    }
  } catch {
    // silently ignore network errors in background
  }
}
