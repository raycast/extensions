import { ActionPanel, Form, getPreferenceValues } from "@raycast/api";
import React, { useState } from "react";
import { getSpecifyIdPlaceholderImageURL } from "./hooks/hooks";
import { SpecifyIdImageConfig } from "./types/types";
import { Preferences } from "./types/preferences";
import { ActionOpenPreferences } from "./components/action-open-preferences";
import { PicsumImageAction } from "./components/picsum-image-action";
import { RevealImageAction } from "./components/reveal-image-action";

export default function StylizePlaceholderImage(props: { id: string; width: number; height: number }) {
  const { id, width, height } = props;
  const { primaryAction } = getPreferenceValues<Preferences>();

  const [picsumConfig, setPicsumConfig] = useState<SpecifyIdImageConfig>({
    id: id,
    width: width + "",
    height: height + "",
    blur: "0",
    jpg: false,
    cache: false,
    grayscale: false,
  });

  const { imageURL } = getSpecifyIdPlaceholderImageURL(picsumConfig);

  return (
    <Form
      navigationTitle={"Stylize Image"}
      actions={
        <ActionPanel>
          <PicsumImageAction
            imageURL={imageURL}
            size={parseInt(picsumConfig.width) + "x" + parseInt(picsumConfig.height)}
            primaryAction={primaryAction}
          />
          <ActionPanel.Section>
            <RevealImageAction
              imageURL={imageURL}
              size={parseInt(picsumConfig.width) + "x" + parseInt(picsumConfig.height)}
              primaryAction={primaryAction}
            />
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
        id={"No Cache"}
        label={"No Cache"}
        value={picsumConfig.cache}
        info={"Prevent the image from being cached"}
        onChange={(newValue) => {
          const _randomImageConfig = { ...picsumConfig };
          _randomImageConfig.cache = newValue;
          setPicsumConfig(_randomImageConfig);
        }}
      />
      <Form.Description title="Image URL" text={imageURL} />
    </Form>
  );
}
