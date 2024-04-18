import { useCallback, useState } from "react";
import { Action, ActionPanel, Grid, Icon, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useGenerateImage } from "../hooks";
import { ImageGenerationModel, saveImageToStore } from "../lib/image";
import { DownloadImageAction } from "../actions";

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

  const onSearchTextChange = useCallback(
    (value: string) => {
      if (data) {
        reset();
      }
      setPrompt(value);
    },
    [data],
  );

  return (
    <Grid
      filtering={false}
      isLoading={isLoading}
      searchBarPlaceholder="Generate an image of..."
      onSearchTextChange={onSearchTextChange}
      columns={Number(preferences.numberOfImages)}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Select an Engine"
          storeValue={true}
          onChange={(newValue) => setModel(newValue as ImageGenerationModel)}
        >
          <Grid.Dropdown.Section title="Emoji Categories">
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
              icon={Icon.Image}
              onAction={() => {
                if (prompt) {
                  generate(prompt, model);
                }
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {isLoading ? (
        <Grid.Section title="Generating your images...">
          {new Array(Number(preferences.numberOfImages)).fill(" ").map((_, index) => (
            <Grid.Item key={index} content=""></Grid.Item>
          ))}
        </Grid.Section>
      ) : data ? (
        <Grid.Section title={`PROMPT (${model}): ${prompt}`}>
          {data.map((imageData) => (
            <Grid.Item
              content={imageData.url}
              key={imageData.id}
              actions={
                <ActionPanel>
                  <DownloadImageAction
                    title="Download"
                    filename={`${imageData.config.prompt}-${imageData.id}`}
                    url={imageData.url}
                  />
                  <Action
                    title="Save Image"
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                    icon={Icon.SaveDocument}
                    onAction={() => {
                      showToast({
                        style: Toast.Style.Animated,
                        title: "Saving image",
                        message: "Saving your image for later!",
                      });
                      saveImageToStore(imageData).then(() => {
                        showToast({
                          style: Toast.Style.Success,
                          title: "Image Saved!",
                          message: "Saved your image for later!",
                        });
                      });
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </Grid.Section>
      ) : (
        <Grid.EmptyView
          title={errorMessage || "Type in a prompt to generate an image"}
          icon={errorMessage ? Icon.Exclamationmark : Icon.Image}
        />
      )}
    </Grid>
  );
};

export default ImageGen;
