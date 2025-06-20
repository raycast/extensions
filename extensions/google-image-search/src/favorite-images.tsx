import { Grid, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { getFavoriteImages } from "./utils/favoritesUtils";
import { ImageActionPanel } from "./components/ImageActionPanel";
import { GoogleImageResult } from "./types";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "./types";

export default function FavoriteImages() {
  const [isLoading, setIsLoading] = useState(true);
  const [favoriteImages, setFavoriteImages] = useState<GoogleImageResult[]>([]);
  const { columns } = getPreferenceValues<Preferences>();

  useEffect(() => {
    // Load favorite images when the component mounts
    const loadFavorites = async () => {
      setIsLoading(true);
      try {
        const favorites = await getFavoriteImages();
        setFavoriteImages(favorites);
      } catch (error) {
        console.error("Error loading favorites:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFavorites();
  }, []);

  return (
    <Grid columns={columns} isLoading={isLoading} throttle={true}>
      {favoriteImages.length === 0 ? (
        <Grid.EmptyView
          title="No Favorite Images"
          description="Add images to favorites from the Search Images command"
          icon={Icon.Star}
        />
      ) : (
        <Grid.Section title="Favorite Images" subtitle={`${favoriteImages.length} images`}>
          {favoriteImages.map((result, index) => {
            const thumbnailSource = result.image?.thumbnailLink || "";
            return (
              <Grid.Item
                key={index}
                content={{ source: thumbnailSource }}
                title={result.title}
                actions={
                  <ImageActionPanel
                    result={result}
                    // Add event handler for refreshing the list when an image is unfavorited
                    onFavoriteToggle={async () => {
                      // Re-fetch favorites after changing favorite status
                      const updatedFavorites = await getFavoriteImages();
                      setFavoriteImages(updatedFavorites);
                    }}
                  />
                }
              />
            );
          })}
        </Grid.Section>
      )}
    </Grid>
  );
}
