import type { Tags } from "exifreader";
import { useEffect, useState } from "react";

import { Clipboard, Toast, open, popToRoot, showToast } from "@raycast/api";

import { exifFromFile, exifFromUrl } from "@/utils/exif";

import TagsScreen from "./screens/TagsScreen";

const main = ({ arguments: { url } }: { arguments: { url: string } }) => {
  const [tagState, setTags] = useState<{ file: string; tags: ExifReader.Tags } | null>(null);

  useEffect(() => {
    const handleTags = (tags: Tags | null, file: string) => {
      if (tags === null) {
        console.log("No tags found, popping to root.");
        popToRoot();
        return;
      }
      setTags({ file, tags });
    };

    (async () => {
      if (url && url.length > 0 && url.startsWith("http")) {
        const tags = await exifFromUrl(url);
        handleTags(tags, url);
        return;
      }

      const { file, text } = await Clipboard.read();

      if (file && file.startsWith("file://")) {
        const tags = await exifFromFile(file);
        handleTags(tags, file);
        return;
      }

      if (text && text.startsWith("http")) {
        const tags = await exifFromUrl(text);
        handleTags(tags, text);
        return;
      }

      await showToast({
        style: Toast.Style.Failure,
        title: "No image found",
        message: "Please copy an image/url to the clipboard, or pass a URL as an argument.",
        primaryAction: {
          title: "Open Clipboard history",
          onAction: async (toast) => {
            await open("raycast://extensions/raycast/clipboard-history/clipboard-history");
            await toast.hide();
          },
        },
      });
      popToRoot();
    })();
  }, []);

  if (tagState === null) {
    return null;
  }

  return <TagsScreen {...tagState} />;
};

export default main;
