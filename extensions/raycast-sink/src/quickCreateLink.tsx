import { showHUD, Clipboard } from "@raycast/api";
import { getPreferenceValues } from "@raycast/api";
import { createLink } from "./utils/api";
import { CreateLinkResponse } from "./types";
import { validUrl } from "./utils/url";
import { nanoid } from "./utils/string";
import { Preferences } from "./types";
import { queryAISlug } from "./utils/api";

interface AISlugResponse {
  slug: string;
}

export default async function () {
  try {
    const preferences = getPreferenceValues<Preferences>();
    const clipboardText = await Clipboard.readText();
    const MAX_ATTEMPTS = 10;

    if (!clipboardText || !validUrl(clipboardText)) {
      await showHUD("No valid URL found in clipboard");
      return;
    }

    await showHUD("Creating Link...");

    let slug = "";
    try {
      const aiSlugRespond = (await queryAISlug(clipboardText)) as AISlugResponse;
      if (aiSlugRespond && aiSlugRespond.slug) {
        slug = aiSlugRespond.slug;
      } else {
        throw new Error("No slug found");
      }
    } catch (error) {
      await showHUD("AI Slug failed, using random slug...");
      slug = nanoid(preferences?.slugLength || 6)();
    }

    let newLink: CreateLinkResponse | null = null;
    let attempts = 0;
    while (!newLink && attempts < MAX_ATTEMPTS) {
      try {
        newLink = (await createLink(clipboardText, slug)) as CreateLinkResponse;
      } catch (error) {
        if (error instanceof Error && error.message.includes("Link already exists")) {
          attempts++;
          await showHUD(`Slug already exists (attempt ${attempts}), trying another...`);
          slug = nanoid(preferences?.slugLength || 6)();
        } else {
          throw error;
        }
      }
    }

    if (!newLink) {
      throw new Error(`Failed to create link after ${MAX_ATTEMPTS} attempts`);
    }

    if (newLink.link) {
      const shortLink = `${preferences?.host}/${newLink.link.slug}`;
      await Clipboard.copy(shortLink);
      await showHUD(`Link Created: ${shortLink} (Copied to clipboard)`);
    }
  } catch (error) {
    await showHUD(`Failed to create link: ${String(error)}`);
  }
}
