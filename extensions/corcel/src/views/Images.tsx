import { Action, ActionPanel, Grid } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { GeneratedImage, getImagesFromStore } from "../lib/image";
import ImageDetail from "./ImageDetail";

const Images: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [images, setImages] = useState<GeneratedImage[]>([]);

  const getImagesAndSetState = useCallback(async () => {
    const imagesInStore = await getImagesFromStore();
    setImages(imagesInStore);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    getImagesAndSetState();
  }, []);

  return (
    <Grid columns={4} isLoading={isLoading}>
      <Grid.Section title="Your saved images">
        {images.map((image) => (
          <Grid.Item
            content={image.url}
            key={image.id}
            actions={
              <ActionPanel>
                <Action.Push title="Select" target={<ImageDetail image={image} />} />
              </ActionPanel>
            }
          />
        ))}
      </Grid.Section>
    </Grid>
  );
};

export default Images;
