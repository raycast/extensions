import { createHash } from "node:crypto";
import { Cache, LocalStorage } from "@raycast/api";
import { host, usesCli } from "./preferences";

const KEY = "review-auth-context";
export async function prepareAuthCache(bearer: string): Promise<void> {
  const context = createHash("sha256")
    .update(`${usesCli() ? "gh" : "pat"}:${host()}:${bearer}`)
    .digest("hex");
  const previous = await LocalStorage.getItem<string>(KEY);
  if (previous && previous !== context) {
    new Cache().clear();
    const items = await LocalStorage.allItems();
    await Promise.all(
      Object.keys(items)
        .filter(
          key =>
            ["updatedPulls", "recentlyVisitedPulls", "githubLogin", "githubAPITokenLastValue"].includes(key) ||
            (key.startsWith("gh-review.") && key !== "gh-review.config" && key !== "gh-review.demo-mode"),
        )
        .map(key => LocalStorage.removeItem(key)),
    );
  }
  // Remove the original extension's plaintext identity-cache copy of the token.
  await LocalStorage.removeItem("githubAPITokenLastValue");
  await LocalStorage.setItem(KEY, context);
}
