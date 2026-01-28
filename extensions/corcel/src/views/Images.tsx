import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";

import { GeneratedImage, getImagesFromStore } from "../lib/image";
import { TOMATO } from "../lib/colors";
import { AddOrRemoveImageFromFavoutitesAction, DownloadImageAction } from "../actions";

import ImageDetail from "./ImageDetail";

const filterOptions = [
  { name: "All", value: "all" },
  { name: "Favourites", value: "favourites" },
] as const;

type FilterOption = (typeof filterOptions)[number]["value"];

const Images: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [filteredImages, setFilteredImages] = useState<GeneratedImage[]>([]);
  const [filterOption, setFilterOption] = useState<FilterOption>("all");

  const getImagesAndSetState = useCallback(async () => {
    const imagesInStore = await getImagesFromStore();
    setImages(imagesInStore);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    getImagesAndSetState();
  }, []);

  useEffect(() => {
    switch (filterOption) {
      case "favourites":
        setFilteredImages(images.filter((image) => image.favourite));
        break;
      case "all":
        setFilteredImages(images);
    }
  }, [filterOption, images]);

  return (
    <Grid
      columns={4}
      isLoading={isLoading}
      searchBarAccessory={
        <Grid.Dropdown
          value={filterOption}
          tooltip="Select a Filter"
          onChange={(newValue) => {
            setFilterOption(newValue as FilterOption);
          }}
        >
          <Grid.Dropdown.Section title="Filter">
            {filterOptions.map((option) => (
              <Grid.Dropdown.Item key={option.value} title={option.name} value={option.value} />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      <Grid.Section title="Your images">
        {filteredImages.map((image) => (
          <Grid.Item
            content={image.url}
            key={image.id}
            accessory={{
              icon: image.favourite
                ? { source: "heart-filled.svg", tintColor: TOMATO, fallback: Icon.Heart }
                : Icon.Heart,
            }}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Select">
                  <Action.Push
                    icon={{ source: "icon-image.svg" }}
                    title="Image Details"
                    target={<ImageDetail image={image} />}
                  />
                  <AddOrRemoveImageFromFavoutitesAction image={image} images={images} setImages={setImages} />
                </ActionPanel.Section>
                <ActionPanel.Section title="Download">
                  <DownloadImageAction image={image} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </Grid.Section>
    </Grid>
  );
};

export default Images;
