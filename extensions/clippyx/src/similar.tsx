import { ActionPanel, Action, Grid, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { useFetch } from "@raycast/utils";
import { exec } from "child_process";
import { promisify } from "util";
import { Image } from "./interface";

const execAsync = promisify(exec);

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [images, setImages] = useState<Image[]>([]);
  const preferences = getPreferenceValues<Preferences.Similar>();

  const { isLoading, data, revalidate } = useFetch("http://localhost:23107/clip_image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: debouncedSearchText,
      threshold: preferences.threshold,
      top_k: preferences.topK,
    }),
  });

  // Debounce function
  const debounce = (func: (arg: string) => void, delay: number): ((arg: string) => void) => {
    let timeoutId: NodeJS.Timeout;
    return (arg: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(arg), delay);
    };
  };

  // Debounced search text setter (wait for 0.5s after user stops typing)
  const debouncedSetSearchText = useCallback(
    debounce((text: string) => setDebouncedSearchText(text), 500),
    [],
  );

  useEffect(() => {
    debouncedSetSearchText(searchText);
  }, [searchText]);

  useEffect(() => {
    if (debouncedSearchText.length === 0) {
      setImages([]);
      return;
    }
    revalidate();
  }, [debouncedSearchText]);

  useEffect(() => {
    if (data) {
      const newImages = (data as string[]).map((path: string, index: number) => ({
        id: index.toString(),
        path: path,
      }));
      setImages(newImages);
    }
  }, [data]);

  const openImage = async (path: string) => {
    try {
      const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
      await execAsync(`${command} "${path}"`);
    } catch (error) {
      console.error("Error opening image:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to open image",
        message: "Please check if the file exists and try again",
      });
    }
  };

  const revealImageInFinder = async (path: string) => {
    try {
      const command =
        process.platform === "darwin"
          ? `open -R "${path}"`
          : process.platform === "win32"
            ? `explorer /select,"${path}"`
            : `xdg-open "${path}"`;
      await execAsync(command);
    } catch (error) {
      console.error("Error opening image location:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to open image location",
        message: "Please check if the file exists and try again",
      });
    }
  };

  return (
    <Grid
      itemSize={Grid.ItemSize.Large}
      searchBarPlaceholder="Search images using CLIP..."
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
    >
      {images.map((image) => (
        <Grid.Item
          key={image.id}
          content={{
            value: `http://localhost:23107/images/${encodeURIComponent(image.path)}`,
            tooltip: `Image path: ${image.path}`,
          }}
          actions={
            <ActionPanel>
              <Action title="Open in Local Viewer" onAction={() => openImage(image.path)} />
              <Action
                title="Reveal in Finder"
                shortcut={{ modifiers: ["cmd"], key: "o" }}
                onAction={() => revealImageInFinder(image.path)}
              />
              <Action.CopyToClipboard content={image.path} title="Copy Image Path" />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
