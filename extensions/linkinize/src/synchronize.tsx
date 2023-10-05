import { LaunchType, launchCommand } from "@raycast/api";
import { LINKINIZE_DOMAIN, BOOKMARKS, ORGANIZATIONS, TOKEN, ACTIVE_ORGANIZATION, CLICKS } from "./constants";
import { getInteractions, logout, cache } from "./support";
import axios, { AxiosResponse } from "axios";

export default async function Command() {
  const token = cache.get(TOKEN);

  if (token) {
    await synchronize(token).then(function () {
      launchCommand({ name: "index", type: LaunchType.UserInitiated });
    });
  } else {
    logout();
  }
}

async function synchronize(token: string) {
  const data = Buffer.from(getInteractions()).toString("base64");
  return axios
    .post(
      `${LINKINIZE_DOMAIN}/api/sync`,
      {
        data: data,
        source: "raycast",
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
    .then(async function (response: AxiosResponse) {
      await cache.set(BOOKMARKS, JSON.stringify(response.data.active.bookmarks));
      await cache.set(ORGANIZATIONS, JSON.stringify(response.data.organizations));
      await cache.set(ACTIVE_ORGANIZATION, response.data.active.organization_id);
      await cache.remove(CLICKS);
      return;
    })
    .catch(async function (error) {
      logout();
    });
}
