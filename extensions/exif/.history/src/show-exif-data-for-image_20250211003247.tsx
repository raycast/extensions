import type { Tags } from "exifreader";
import { useEffect, useState } from "react";

import { Clipboard, Toast, getSelectedFinderItems, open, popToRoot, showToast } from "@raycast/api";

import { exifFromFile, exifFromUrl } from "@/utils/exif";

import TagsScreen from "./screens/TagsScreen";

const main = ({ arguments: { url } }: { arguments: { url: string } }) => {
  const [tagState, setTags] = useState<{ file: string; tags: Tags } | null>(null);

  useEffect(() => {
   const handleTags = (tags: Tags | null, file: string) => {
     if (!tags || typeof tags !== 'object') {
       console.log("No valid tags found, popping to root.");
       popToRoot();
       return;
     }
   
     // Ensure all tag values have the correct structure
     const validTags = Object.fromEntries(
       Object.entries(tags).map(([key, value]) => {
         if (!value) return [key, { value: null, description: 'null' }];
         if (typeof value === 'object' && 'value' in value && 'description' in value) {
           return [key, value];
         }
         return [key, { value, description: String(value) }];
       })
     );
   
     setTags({ file, tags: validTags as Tags });
   };

    (async () => {
      if (url && url.length > 0 && url.startsWith("http")) {
        const tags = await exifFromUrl(url);
        handleTags(tags, url);
        return;
      }

      const { file, text } = await Clipboard.read();

      if (file && file.startsWith("file://")) {
        // Convert file URL to file path for exifFromFile
        const filePath = file.replace("file://", "");
        const tags = await exifFromFile(filePath);
        handleTags(tags, file); // Pass original file URL
        return;
      }

      if (text && text.startsWith("http")) {
        const tags = await exifFromUrl(text);
        handleTags(tags, text);
        return;
      }

      const finderItems = await getSelectedFinderItems();
      if (finderItems.length > 0) {
        const filePath = finderItems[0].path;
        const tags = await exifFromFile(filePath);
        handleTags(tags, filePath);
        return;
      }

      await showToast({
        style: Toast.Style.Failure,
        title: "No image found",
        message: "Please copy an image/url to the clipboard, select a file in Finder, or pass a URL as an argument.",
        primaryAction: {
          title: "Open Clipboard history",
          onAction: async (toast) => {
            await open("raycast://extensions/raycast/clipboard-history/clipboard-history");
            await toast.hide();
          },
        },
      });
    })();
  }, [url]);

  return tagState ? <TagsScreen tags={tagState.tags} file={tagState.file} /> : null;
};

export default main;
