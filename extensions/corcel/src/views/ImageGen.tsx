import { useCallback, useEffect, useState } from "react";
import { Action, ActionPanel, Grid, Icon, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useGenerateImage } from "../hooks";
import { GeneratedImage, ImageGenerationModel, saveImageToStore } from "../lib/image";
import { AddOrRemoveImageFromFavoutitesAction, DownloadImageAction } from "../actions";
import { TOMATO } from "../lib/colors";
import { OpenSavedImagesAction } from "../actions/open-saved-images";
import { NUMBER_OF_IMAGES_RANGE } from "../lib/constants";
import { clamp } from "../lib/math";

const models: { name: string; value: ImageGenerationModel }[] = [
  { name: "Proteus", value: "proteus" },
  { name: "Playground", value: "playground" },
  { name: "Dreamshaper", value: "dreamshaper" },
];

const ImageGen: React.FC = () => {
  const preferences = getPreferenceValues<Preferences.Image>();
  const [prompt, setPrompt] = useState("");
  const { generate, isLoading, data, errorMessage, reset } = useGenerateImage();
  const [model, setModel] = useState<ImageGenerationModel>(preferences.model);
  const [displayedImages, setDisplayedImages] = useState<GeneratedImage[]>();

  const onSearchTextChange = useCallback(
    (value: string) => {
      if (data) {
        reset();
      }
      setPrompt(value);
    },
    [data],
  );

  const generateImage = useCallback(() => {
    if (prompt) {
      generate(prompt, model);
    }
  }, [prompt, model]);

  useEffect(() => {
    setDisplayedImages(data);
  }, [data]);

  const handleSaveImage = useCallback((image: GeneratedImage) => {
    showToast({ title: "Saving image...", style: Toast.Style.Animated });
    saveImageToStore(image)
      .then(() => {
        showToast({ title: "Image Saved Succcessfully", style: Toast.Style.Success });
      })
      .catch(() => {
        showToast({ title: "Failed to Save Image", style: Toast.Style.Failure });
      });
  }, []);

  return (
    <Grid
      filtering={false}
      isLoading={isLoading}
      searchBarPlaceholder="Generate an image of..."
      onSearchTextChange={onSearchTextChange}
      columns={clamp(NUMBER_OF_IMAGES_RANGE[0], NUMBER_OF_IMAGES_RANGE[1], Number(preferences.numberOfImages))}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Select a Model"
          value={model}
          onChange={(newValue) => {
            setModel(newValue as ImageGenerationModel);
            reset();
          }}
        >
          <Grid.Dropdown.Section title="Models">
            {models.map((model) => (
              <Grid.Dropdown.Item key={model.value} title={model.name} value={model.value} />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Input">
            <Action
              title="Generate Image"
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              icon={{ source: "icon-image.svg" }}
              onAction={generateImage}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Navigation">
            <OpenSavedImagesAction />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {isLoading || (!displayedImages && data) ? (
        <Grid.Section title="Generating your images...">
          {new Array(Number(preferences.numberOfImages)).fill(" ").map((_, index) => (
            <Grid.Item key={index} content=""></Grid.Item>
          ))}
        </Grid.Section>
      ) : displayedImages ? (
        <Grid.Section title={`PROMPT (${displayedImages[0].config.engine}): ${displayedImages[0].config.prompt}`}>
          {displayedImages.map((imageData) => (
            <Grid.Item
              content={imageData.url}
              key={imageData.id}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Save image">
                    <Action
                      icon={Icon.SaveDocument}
                      title="Save for Later"
                      shortcut={{ modifiers: ["cmd"], key: "s" }}
                      onAction={() => {
                        handleSaveImage(imageData);
                      }}
                    />

                    <DownloadImageAction image={imageData} />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Navigation">
                    <OpenSavedImagesAction />
                  </ActionPanel.Section>

                  <AddOrRemoveImageFromFavoutitesAction
                    images={displayedImages}
                    setImages={setDisplayedImages}
                    image={imageData}
                  />
                </ActionPanel>
              }
            />
          ))}
        </Grid.Section>
      ) : (
        <Grid.EmptyView
          title={errorMessage || "Type in a prompt to generate an image"}
          icon={errorMessage ? { source: Icon.Exclamationmark, tintColor: TOMATO } : { source: "icon-image.svg" }}
        />
      )}
    </Grid>
  );
};

export default ImageGen;
