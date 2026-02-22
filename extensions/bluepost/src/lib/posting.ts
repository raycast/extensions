import { showToast, Toast } from "@raycast/api";
import type { MastodonAccount } from "./accounts";
import { login, createPost, downloadBlob, type BlueskyPost } from "./bluesky";
import { createClient, postStatus, uploadMedia } from "./mastodon";
import { markReposted } from "./repost-history";

export async function postToAll(params: {
  text: string;
  url?: string;
  images?: string[];
  mastodonAccounts: MastodonAccount[];
}): Promise<void> {
  const { text, url, images, mastodonAccounts } = params;

  // Read image files
  const imageData: Array<{ data: Uint8Array; mimeType: string }> = [];
  if (images && images.length > 0) {
    const fs = await import("fs");
    for (const filePath of images) {
      const buffer = fs.readFileSync(filePath);
      const ext = filePath.split(".").pop()?.toLowerCase();
      const mimeType =
        ext === "png"
          ? "image/png"
          : ext === "gif"
            ? "image/gif"
            : ext === "webp"
              ? "image/webp"
              : "image/jpeg";
      imageData.push({ data: new Uint8Array(buffer), mimeType });
    }
  }

  // Post to Bluesky
  try {
    const agent = await login();
    await createPost(agent, {
      text,
      url: url || undefined,
      images: imageData.length > 0 ? imageData : undefined,
    });
    await showToast({
      style: Toast.Style.Success,
      title: "Posted to Bluesky",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed: Bluesky",
      message: String(error),
    });
  }

  // Post to each Mastodon account
  const mastodonText = url ? `${text}\n\n${url}` : text;
  for (const account of mastodonAccounts) {
    try {
      const client = createClient(account);

      const mediaIds: string[] = [];
      if (imageData.length > 0) {
        for (const img of imageData) {
          const blob = new Blob([img.data], { type: img.mimeType });
          const uploaded = await uploadMedia(client, blob);
          mediaIds.push(uploaded.id);
        }
      }

      await postStatus(client, {
        status: mastodonText,
        mediaIds: mediaIds.length > 0 ? mediaIds : undefined,
      });
      await showToast({
        style: Toast.Style.Success,
        title: "Posted to Mastodon",
        message: account.instance,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed: ${account.instance}`,
        message: String(error),
      });
    }
  }
}

export async function repostToMastodon(
  post: BlueskyPost,
  mastodonAccounts: MastodonAccount[],
): Promise<void> {
  for (const account of mastodonAccounts) {
    try {
      const client = createClient(account);

      const mediaIds: string[] = [];
      for (const image of post.images) {
        const { blob } = await downloadBlob(image.url);
        const uploaded = await uploadMedia(
          client,
          blob,
          image.alt || undefined,
        );
        mediaIds.push(uploaded.id);
      }

      await postStatus(client, {
        status: post.text,
        mediaIds: mediaIds.length > 0 ? mediaIds : undefined,
      });

      await markReposted(post.uri, account.id);

      await showToast({
        style: Toast.Style.Success,
        title: "Reposted to Mastodon",
        message: account.instance,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed: ${account.instance}`,
        message: String(error),
      });
    }
  }
}
