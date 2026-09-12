import { useState } from "react";
import { ActionPanel, Form } from "@raycast/api";
import type { SpecifyIdImageConfig } from "@/types/types";
import useSpecifyIdPlaceholderImageURL from "@/hooks/use-placeholder-image-url";
import { ActionOpenPreferences } from "@/components/action-open-preferences";
import { PicsumImageAction } from "@/components/picsum-image-action";
import { RevealImageAction } from "@/components/reveal-image-action";

export default function StylizePlaceholder(props: { id: string; width: number; height: number }) {
  const { id, width, height } = props;

  const [picsumConfig, setPicsumConfig] = useState<SpecifyIdImageConfig>({
    id: id,
    width: width + "",
    height: height + "",
    blur: "0",
    jpg: false,
    cache: false,
    grayscale: false,
  });

  const { imageURL } = useSpecifyIdPlaceholderImageURL(picsumConfig);

  return (
    <Form
      navigationTitle={"Stylize Image"}
      actions={
        <ActionPanel>
          <PicsumImageAction
            imageURL={imageURL}
            size={parseInt(picsumConfig.width) + "x" + parseInt(picsumConfig.height)}
          />
          <ActionPanel.Section>
            <RevealImageAction
              imageURL={imageURL}
              size={parseInt(picsumConfig.width) + "x" + parseInt(picsumConfig.height)}
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
          setPicsumConfig((prev) => ({ ...prev, width: newValue }));
        }}
      />
      <Form.TextField
        id={"Height"}
        title="Height"
        value={picsumConfig.height}
        info={"Image height"}
        placeholder={"300"}
        onChange={(newValue) => {
          setPicsumConfig((prev) => ({ ...prev, height: newValue }));
        }}
      />
      <Form.TextField
        id={"Blur"}
        title="Blur"
        value={picsumConfig.blur}
        placeholder={"0-10"}
        info={"Level of image blurriness form 0-10"}
        onChange={(newValue) => {
          setPicsumConfig((prev) => ({ ...prev, blur: newValue }));
        }}
      />
      <Form.Checkbox
        id={"JPG"}
        label={"JPG"}
        value={picsumConfig.jpg}
        info={"Get image url as .jpg"}
        onChange={(newValue) => {
          setPicsumConfig((prev) => ({ ...prev, jpg: newValue }));
        }}
      />
      <Form.Checkbox
        id={"Grayscale"}
        label={"Grayscale"}
        value={picsumConfig.grayscale}
        info={"Image grayscale or normal"}
        onChange={(newValue) => {
          setPicsumConfig((prev) => ({ ...prev, grayscale: newValue }));
        }}
      />
      <Form.Checkbox
        id={"No Cache"}
        label={"No Cache"}
        value={picsumConfig.cache}
        info={"Prevent the image from being cached"}
        onChange={(newValue) => {
          setPicsumConfig((prev) => ({ ...prev, cache: newValue }));
        }}
      />
      <Form.Description title="Image URL" text={imageURL} />
    </Form>
  );
}
