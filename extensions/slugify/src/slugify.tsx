import { showHUD, Clipboard, LaunchProps } from "@raycast/api";
import slugify from "slugify";

export default async (props: LaunchProps<{ arguments: Arguments.Slugify }>) => {
  const strict = props.arguments.strict !== "0";
  const textToSlugify = await Clipboard.readText();

  if (textToSlugify) {
    const slug = slugify(textToSlugify, {
      lower: true,
      replacement: "-",
      trim: true,
      strict,
    });

    const successMessage = `Copied slug: ${slug}`;
    await Clipboard.copy(slug);
    await showHUD(`✅ ${successMessage}`);
  } else {
    await showHUD(`❌ Your clipboard is empty`);
  }
};
