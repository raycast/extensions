import { Action, ActionPanel, Detail, LaunchProps } from "@raycast/api";
import { useEffect, useState } from "react";
import { grabImage } from "./modules/image-lib";

async function fetchImageAsDataUrl(assetId: number): Promise<string | null> {
  // Grab the image (returns { fileBuffer, contentType } or fallback)
  const imageData = await grabImage(assetId);
  if (!imageData) {
    return null; // Means we couldn't get anything
  }

  const { contentType, fileBuffer } = imageData;
  if (!fileBuffer || fileBuffer.length === 0) {
    return null; // Means it’s empty or invalid data
  }

  // Convert the buffer to a base64 data URL
  const base64 = fileBuffer.toString("base64");
  return `data:${contentType};base64,${base64}`;
}

// Raycast command
export default function ShowImage(props: LaunchProps<{ arguments: { id: string } }>) {
  const { id: enteredImageId } = props.arguments;

  // We’ll let this state be:
  //   - undefined => in-progress/loading
  //   - null => failed to fetch
  //   - string => success
  const [imageUrl, setImageUrl] = useState<string | null | undefined>(undefined);

  // Validate the ID
  const imageId = Number(enteredImageId);
  const isValidNumber = !isNaN(imageId) && imageId > 0;

  useEffect(() => {
    if (isValidNumber) {
      setImageUrl(undefined); // reset to loading state each time we fetch
      fetchImageAsDataUrl(imageId).then((url) => {
        setImageUrl(url); // null if fail, string if success
      });
    }
  }, [imageId]);

  // 1) If not a valid number, show that message
  if (!isValidNumber) {
    return <Detail markdown={`# ⚠️ Invalid Input\nPlease enter a valid numeric Image ID.`} />;
  }

  // 2) If our state is still undefined, that means we’re loading
  if (imageUrl === undefined) {
    return <Detail markdown="# Loading..." />;
  }

  // 3) If the URL is null, that means we failed to fetch
  if (imageUrl === null) {
    return <Detail markdown={`# ❌ Failed to Fetch Image\nWe couldn't retrieve the image. Please try another ID.`} />;
  }

  // 4) Otherwise, we have a valid data URL
  return (
    <Detail
      markdown={`# Image ID: ${imageId}\n![](${imageUrl}?raycast-height=280)`}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={`https://api.toilettowerdefense.com/image/${imageId}`} />
        </ActionPanel>
      }
    />
  );
}
