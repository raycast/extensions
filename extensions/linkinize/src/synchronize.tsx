import { Cache, LaunchType, launchCommand, showToast } from "@raycast/api";
import { LINKINIZE_DOMAIN, BOOKMARKS, ORGANIZATIONS, TOKEN } from "./constants";
import { logout } from "./support";
import axios, { AxiosResponse } from "axios";

const cache = new Cache();
export default async function Command() {
  const token = cache.get(TOKEN);

  if (token) {
    await synchronize(token);
    await showToast({ title: "Success!", message: "Everything is up to date 🚀" });
    await launchCommand({ name: "index", type: LaunchType.UserInitiated });
  } else {
    logout();
  }
}

async function synchronize(token: string) {
  axios
    .post(
      `${LINKINIZE_DOMAIN}/api/sync`,
      { data: null },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
    .then(async function (response: AxiosResponse) {
      await cache.set(BOOKMARKS, JSON.stringify(response.data.active.bookmarks));
      await cache.set(ORGANIZATIONS, JSON.stringify(response.data.organizations));
      return;
    })
    .catch(async function (error) {
      console.log("Synchronization Error", error.response);
      logout();
    });
}
