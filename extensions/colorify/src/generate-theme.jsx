import { Form, AI, ActionPanel, Action, popToRoot, open, Toast, showToast, environment } from "@raycast/api";
import { useState } from "react";
import fs from "fs";
import ColorThief from "./colorthief";
import Jimp from "jimp";
import sizeOf from "image-size";

export default function Command() {
  if (!environment.canAccess(AI)) {
    popToRoot();
    showToast({
      style: Toast.Style.Failure,
      title: "Please get Pro to use this extension.",
    });
  } else {
    const rgbToHex = (rgb) => "#" + rgb.map((x) => x.toString(16).padStart(2, "0")).join("");

    const [imageError, setImageError] = useState();

    const dropImageErrorIfNeeded = () => {
      if (imageError && imageError.length > 0) {
        setImageError(undefined);
      }
    };

    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              onSubmit={async (values) => {
                try {
                  const image = values.image[0];
                  let name = values.themeName;
                  let appearance = values.appearance;
                  if (!fs.existsSync(image) || !fs.lstatSync(image).isFile()) {
                    return false;
                  }
                  showToast({
                    style: Toast.Style.Animated,
                    title: "Loading Theme",
                    message: "Using Raycast AI to generate your Theme",
                  });
                  await Jimp.read(image).then(async (image) => {
                    return image
                      .resize(1920, 1080)
                      .getBufferAsync(Jimp.MIME_PNG)
                      .then(async (resizedImageBuffer) => {
                        await ColorThief.getPalette(resizedImageBuffer, 7)
                          .then(async (palette) => {
                            let hex = palette.map((x) => rgbToHex(x));
                            let polished;
                            if (appearance === "light") {
                              polished = await AI.ask(
                                `I am making a LIGHT theme for a product, based on this palette: ${hex.join()}. Choose a \`bgLight\` and a \`bgDark\` for the background. Make them CLOSE TO EACH OTHER, NEAR WHITE and DULL, but still include a bit of color. Based on the background, choose the \`text\` color, choose a color that has GOOD CONTRAST aginst BOTH background colors. A bright, POPPING (\`highlight\`) is also necessary. You may add to or modify the original palette to improve CONTRAST and LEGIBILITY. Return your result ONLY in an array of strings: [bgLight, bgDark, text, highlight], such that it can be parsed with JSON.parse().`,
                                { creativity: 0 }
                              );
                            } else {
                              polished = await AI.ask(
                                `I am making a DARK theme for a product, based on this palette: ${hex.join()}. Choose a \`bgLight\` and a \`bgDark\` for the background. Keep the colors CLOSE to each other. Ensure that the background looks GOOD on a DARK BACKGROUND. You may have to MODIFY the colors to do this. For \`text\`, choose a color that has GOOD CONTRAST aginst BOTH background colors. A bright, POPPING (\`highlight\`) is also necessary. You may add to or modify the original palette to improve CONTRAST and LEGIBILITY. Return your result ONLY in an array of strings: [bgLight, bgDark, text, highlight], such that it can be parsed with JSON.parse().`,
                                { creativity: 0 }
                              );
                            }

                            let encode = (string) => {
                              return encodeURI(string).replace("#", "%23");
                            };

                            let [backgroundLight, backgroundDark, text, highlight] = JSON.parse(
                              polished.trim().replace("Result: ", "")
                            ).map((x) => encode(x));

                            if (!name) {
                              showToast({
                                style: Toast.Style.Animated,
                                title: "Loading Title",
                                message: "Using Raycast AI to generate a Title for your Theme",
                              });

                              name = await AI.ask(
                                `Given the following colors: ${hex.join()}, name a Raycast Theme. Use 1-2 words, and more only if necessary. Some example names are "White Flames", "Bright Lights", "Burning Candle". Keep in mind this is a ${appearance} theme, so adapt the title to it. Do not include any punctuation or special characters in your title, including quotation marks.`,
                                { creativity: 2 }
                              );

                              name = name.trim().replaceAll('"', "") ?? "New Theme";
                            }

                            name = encode(name);

                            showToast({
                              style: Toast.Style.Success,
                              title: "Theme Finished",
                              message: "Accept the theme download and enjoy!",
                            });

                            open(
                              `raycast://theme?version=1&name=${name}&appearance=${appearance}&colors=${backgroundLight},${backgroundDark},${text},${highlight},${highlight},%23F50A0A,%23F5600A,%23E0A200,%2307BA65,%230A7FF5,%23470AF5,%23F50AA3`
                            );
                          })
                          .catch((e) => {
                            showToast({
                              style: Toast.Style.Failure,
                              title: "Generation Failed",
                              message: "Try again, and submit an issue if it fails again.",
                            });
                          });
                      });
                  });
                  popToRoot();
                } catch {
                  showToast({
                    style: Toast.Style.Failure,
                    title: "Generation Failed",
                    message: "Try again, and submit an issue if it fails again.",
                  });
                  popToRoot();
                }
              }}
            />
          </ActionPanel>
        }
      >
        <Form.Description
          title="Theme Name"
          text="Theme name is optional. Leave it blank to have AI generate it for you!"
        />
        <Form.TextField id="themeName" placeholder="Name your theme..." />
        <Form.Description
          title="Image"
          text="Only images smaller than 4096x4096 in Bitmap format work. If you must use such a high-quality image, please ues an external image compressor."
        />
        <Form.FilePicker
          id="image"
          title="Image"
          allowMultipleSelection={false}
          error={imageError}
          onChange={dropImageErrorIfNeeded}
          onBlur={(event) => {
            sizeOf(event.target.value[0], function (_, dim) {
              if (dim.width > 4096 || dim.height > 4096) {
                setImageError("Please keep the image under 4096x4096");
              }
            });
            if (event.target.value?.length === 0) {
              setImageError("Please choose an image to use.");
            } else {
              dropImageErrorIfNeeded();
            }
          }}
        />
        <Form.Separator />
        <Form.Description
          title="Theme Type"
          text="Depending on your choice, Colorify will either create a darker theme, or a lighter-colored theme."
        />
        <Form.Dropdown id="appearance" defaultValue="light">
          <Form.Dropdown.Item value="light" title="Light Theme" />
          <Form.Dropdown.Item value="dark" title="Dark Theme" />
        </Form.Dropdown>
        <Form.Description
          title="Disclaimer"
          text="Colorify extracts colors from your original image and uses AI to enhance your theme. Because of this, if you provide a light-colored image, it may not generate a good Dark Theme, and vice versa. Feel free to try it out, but a good result is not guarenteed."
        />
      </Form>
    );
  }
}
