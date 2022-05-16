import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { Picsum } from "picsum-photos/dist";
import { ImageDetail } from "./components/image-detail";
import { commonPreferences } from "./utils/common-utils";
import { ImageAction } from "./components/image-action";

export default function CreateShortcut() {
  const [width, setWidth] = useState<string>("300");
  const [height, setHeight] = useState<string>("300");
  const [blur, setBlur] = useState<string>("0");
  const [jpg, setJpg] = useState<boolean>(false);
  const [grayscale, setGrayscale] = useState<boolean>();
  const [cache, setCache] = useState<boolean>(false);
  const [staticRandom, setStaticRandom] = useState<boolean>(true);
  const [refresh, setRefresh] = useState<number>(0);

  const [imageURL, setImageURL] = useState<string>("");
  const { primaryAction, autoRefresh } = commonPreferences();

  useEffect(() => {
    async function _fetch() {
      let _blur = parseFloat(blur);
      if (isNaN(_blur) || _blur < 0) {
        _blur = 0;
      }
      if (_blur > 10) {
        _blur = 10;
      }
      let _imageURL = Picsum.url({
        width: parseInt(width),
        height: parseInt(height),
        blur: _blur,
        cache: cache,
        grayscale: grayscale,
        jpg: jpg,
      });
      if (staticRandom) {
        _imageURL = _imageURL.replace("https://picsum.photos/", "https://picsum.photos/seed/" + Date.now() + "/");
      }
      setImageURL(_imageURL);
    }

    _fetch().then();
  }, [width, height, blur, jpg, cache, staticRandom, grayscale, refresh]);

  return (
    <Form
      actions={
        <ActionPanel>
          <ImageAction
            imageURL={imageURL}
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
                  primaryAction={primaryAction}
                  autoRefresh={autoRefresh}
                  setRefresh={setRefresh}
                />
              }
            />
            <Action.OpenInBrowser shortcut={{ modifiers: ["cmd"], key: "o" }} url={imageURL} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {staticRandom && (
              <Action
                icon={Icon.TwoArrowsClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                title={"Refresh Image URL"}
                onAction={() => {
                  setRefresh(refresh + 1);
                }}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextField
        id={"Width"}
        title="Width"
        value={width + ""}
        info={"Image width"}
        placeholder={"300"}
        onChange={(newValue) => {
          setWidth(newValue);
        }}
      />
      <Form.TextField
        id={"Height"}
        title="Height"
        value={height}
        info={"Image height"}
        placeholder={"300"}
        onChange={(newValue) => {
          setHeight(newValue);
        }}
      />
      <Form.TextField
        id={"Blur"}
        title="Blur"
        value={blur}
        placeholder={"0-10"}
        info={"Level of image blurriness form 0-10"}
        onChange={(newValue) => {
          setBlur(newValue);
        }}
      />
      <Form.Checkbox
        id={"JPG"}
        label={"JPG"}
        value={jpg}
        info={"Get image url as .jpg"}
        onChange={(newValue) => {
          setJpg(newValue);
        }}
      />
      <Form.Checkbox
        id={"Grayscale"}
        label={"Grayscale"}
        value={grayscale}
        info={"Image grayscale or normal"}
        onChange={(newValue) => {
          setGrayscale(newValue);
        }}
      />
      <Form.Checkbox
        id={"Cache"}
        label={"Cache"}
        value={cache}
        info={"Allow browser image cache"}
        onChange={(newValue) => {
          setCache(newValue);
        }}
      />
      <Form.Checkbox
        id={"Static Random"}
        label={"Static Random"}
        value={staticRandom}
        info={"Get the same random image every time based on a seed"}
        onChange={(newValue) => {
          setStaticRandom(newValue);
        }}
      />
      <Form.Description title="Image URL" text={imageURL} />
    </Form>
  );
}
