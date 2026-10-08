import { open, closeMainWindow, showToast, Toast } from "@raycast/api";
import { getUser } from "./lib/api";
import { Me } from "./lib/models";

import { getCachedUser, cacheUser } from "./lib/persistence";

export default async () => {
  const cachedUser = await getCachedUser();

  if (cachedUser) {
    openMonday(cachedUser);
  } else {
    try {
      // If this is the first time the user is using this command,
      // they won't have a cached user, and no slug to construct
      // their monday URL from. So, we fetch and cache.
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Just a moment...",
      });

      const user = await getUser();
      cacheUser(user);
      toast.hide();
      openMonday(user);
    } catch (error) {
      showToast(Toast.Style.Failure, error as string);
    }
  }

  async function openMonday(user: Me) {
    await open(`https://${user.account.slug}.monday.com`);
    await closeMainWindow();
  }
};
