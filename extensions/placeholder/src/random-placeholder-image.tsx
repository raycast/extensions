import { Action, ActionPanel, Form, getPreferenceValues, Icon } from "@raycast/api";
import { useState } from "react";
import { ImageDetail } from "./components/image-detail";
import { PicsumImageAction } from "./components/picsum-image-action";
import { getRandomPlaceholderImageURL } from "./hooks/hooks";
import { RandomImageConfig, randomImageConfigInit } from "./types/types";
import { Preferences } from "./types/preferences";
import { ActionOpenPreferences } from "./components/action-open-preferences";

export default function CreateShortcut() {
  const { primaryAction, autoRefresh } = getPreferenceValues<Preferences>();

  const [picsumConfig, setPicsumConfig] = useState<RandomImageConfig>(randomImageConfigInit);
  const [refresh, setRefresh] = useState<number>(0);

  const { imageURL } = getRandomPlaceholderImageURL(picsumConfig, refresh);

  return (
    <Form
      actions={
        <ActionPanel>
          <PicsumImageAction
            imageURL={imageURL}
            size={parseInt(picsumConfig.width) + "x" + parseInt(picsumConfig.height)}
            primaryAction={primaryAction}
            autoRefresh={autoRefresh}
            setRefresh={setRefresh}
          />
          <ActionPanel.Section>
            <Action.Push
              icon={Icon.Window}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              title={"Show in Raycast"}
              target={
                <ImageDetail
                  imageURL={imageURL}
                  size={parseInt(picsumConfig.width) + "x" + parseInt(picsumConfig.height)}
                  primaryAction={primaryAction}
                  autoRefresh={autoRefresh}
                  setRefresh={setRefresh}
                />
              }
            />
            <Action.OpenInBrowser shortcut={{ modifiers: ["cmd"], key: "o" }} url={imageURL} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {picsumConfig.staticRandom && (
              <Action
                icon={Icon.TwoArrowsClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                title={"Refresh Image URL"}
                onAction={() => {
                  setRefresh(Date.now);
                }}
              />
            )}
          </ActionPanel.Section>
          <ActionOpenPreferences />
        </ActionPanel>
      }
    >
      <Form.TextField
        id={"Width"}
        title="Width"
        value={picsumConfig.width + ""}
        info={"Image width"}
        placeholder={"300"}
        onChange={(newValue) => {
          const _randomImageConfig = { ...picsumConfig };
          _randomImageConfig.width = newValue;
          setPicsumConfig(_randomImageConfig);
        }}
      />
      <Form.TextField
        id={"Height"}
        title="Height"
        value={picsumConfig.height}
        info={"Image height"}
        placeholder={"300"}
        onChange={(newValue) => {
          const _randomImageConfig = { ...picsumConfig };
          _randomImageConfig.height = newValue;
          setPicsumConfig(_randomImageConfig);
        }}
      />
      <Form.TextField
        id={"Blur"}
        title="Blur"
        value={picsumConfig.blur}
        placeholder={"0-10"}
        info={"Level of image blurriness form 0-10"}
        onChange={(newValue) => {
          const _randomImageConfig = { ...picsumConfig };
          _randomImageConfig.blur = newValue;
          setPicsumConfig(_randomImageConfig);
        }}
      />
      <Form.Checkbox
        id={"JPG"}
        label={"JPG"}
        value={picsumConfig.jpg}
        info={"Get image url as .jpg"}
        onChange={(newValue) => {
          const _randomImageConfig = { ...picsumConfig };
          _randomImageConfig.jpg = newValue;
          setPicsumConfig(_randomImageConfig);
        }}
      />
      <Form.Checkbox
        id={"Grayscale"}
        label={"Grayscale"}
        value={picsumConfig.grayscale}
        info={"Image grayscale or normal"}
        onChange={(newValue) => {
          const _randomImageConfig = { ...picsumConfig };
          _randomImageConfig.grayscale = newValue;
          setPicsumConfig(_randomImageConfig);
        }}
      />
      <Form.Checkbox
        id={"Cache"}
        label={"Cache"}
        value={picsumConfig.cache}
        info={"Allow browser image cache"}
        onChange={(newValue) => {
          const _randomImageConfig = { ...picsumConfig };
          _randomImageConfig.cache = newValue;
          setPicsumConfig(_randomImageConfig);
        }}
      />
      <Form.Checkbox
        id={"Static Random"}
        label={"Static Random"}
        value={picsumConfig.staticRandom}
        info={"Get the same random image every time based on a seed"}
        onChange={(newValue) => {
          const _randomImageConfig = { ...picsumConfig };
          _randomImageConfig.staticRandom = newValue;
          setPicsumConfig(_randomImageConfig);
        }}
      />
      <Form.Description title="Image URL" text={imageURL} />
    </Form>
  );
}
