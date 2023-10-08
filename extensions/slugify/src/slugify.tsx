import { showHUD, Clipboard } from "@raycast/api";
import slugify from "slugify";

export default async () => {
  const textToSlugify = await Clipboard.readText();

  if (textToSlugify) {
    const slug = slugify(textToSlugify, {
      lower: true,
      replacement: "-",
      trim: true,
    });

    const successMessage = `Copied slug: ${slug}`;
    await Clipboard.copy(slug);
    await showHUD(`✅ ${successMessage}`);
  } else {
    await showHUD(`❌ Your clipboard is empty`);
  }
};
