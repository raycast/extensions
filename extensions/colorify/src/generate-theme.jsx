import { Form, AI, ActionPanel, Action, popToRoot, open, Toast, showToast, environment } from "@raycast/api";
import { useState } from "react";
import fs from "fs";
import ColorThief from "colorthief";

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
                await ColorThief.getPalette(image, 7)
                  .then(async (palette) => {
                    let hex = palette.map((x) => rgbToHex(x));
                    let polished;
                    if (appearance === "light") {
                      polished = await AI.ask(
                        `I am making a LIGHT theme for a product, based on this palette: ${hex.join()}. Choose a \`bgLight\` and a \`bgDark\` for the background. Keep the colors CLOSE to each other. Ensure that the background is CLOSE TO WHITE and LIGHT. For \`text\`, choose a color that has GOOD CONTRAST aginst BOTH background colors. A bright, POPPING (\`highlight\`) is also necessary. You may add to or modify the original palette to improve CONTRAST and LEGIBILITY. Return your result in an array of strings: [bgLight, bgDark, text, highlight], such that it can be parsed with JSON.parse()`
                      );
                    } else {
                      polished = await AI.ask(
                        `I am making a DARK theme for a product, based on this palette: ${hex.join()}. Choose a \`bgLight\` and a \`bgDark\` for the background. Keep the colors CLOSE to each other. Ensure that the background looks GOOD on a DARK BACKGROUND. For \`text\`, choose a color that has GOOD CONTRAST aginst BOTH background colors. A bright, POPPING (\`highlight\`) is also necessary. You may add to or modify the original palette to improve CONTRAST and LEGIBILITY. Return your result in an array of strings: [bgLight, bgDark, text, highlight], such that it can be parsed with JSON.parse()`
                      );
                    }

                    let encode = (string) => {
                      return encodeURI(string).replace("#", "%23");
                    };

                    let [backgroundLight, backgroundDark, text, highlight] = JSON.parse(polished.trim()).map((x) =>
                      encode(x)
                    );

                    if (!name) {
                      showToast({
                        style: Toast.Style.Animated,
                        title: "Loading Title",
                        message: "Using Raycast AI to generate a Title for your Theme",
                      });

                      name = await AI.ask(
                        `Given the following colors: ${hex.join()}, name a Raycast Theme. Use 1-2 words, and more only if necessary. Some example names are "White Flames", "Bright Lights", "Burning Candle". Do not include any punctuation or special characters in your title, including quotation marks.`
                      );
                      name = name.trim().replaceAll('"', "");
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
                  .catch(() => {
                    showToast({
                      style: Toast.Style.Success,
                      title: "Generation Failed",
                      message: "Try again, and submit an issue if it fails again.",
                    });
                  });
                popToRoot();
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
        <Form.FilePicker
          id="image"
          title="Image"
          allowMultipleSelection={false}
          error={imageError}
          onChange={dropImageErrorIfNeeded}
          onBlur={(event) => {
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
      </Form>
    );
  }
}
