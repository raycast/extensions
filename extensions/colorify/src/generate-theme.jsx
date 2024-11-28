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
    const [showAdvanced, setShowAdvanced] = useState(false);

    const dropImageErrorIfNeeded = () => {
      if (imageError && imageError.length > 0) {
        setImageError(undefined);
      }
    };

    const orderHexColors = (lighterHex, darkerHex) => {
      // Convert hex colors to RGB
      function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        const r = parseInt(result[1], 16);
        const g = parseInt(result[2], 16);
        const b = parseInt(result[3], 16);
        return [r, g, b];
      }

      // Calculate the lightness value of a color
      function getLightness(rgb) {
        const [r, g, b] = rgb.map((channel) => channel / 255);
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        return (max + min) / 2;
      }

      // Convert hex colors to RGB
      const lighterRgb = hexToRgb(lighterHex);
      const darkerRgb = hexToRgb(darkerHex);

      // Calculate lightness values
      const lighterLightness = getLightness(lighterRgb);
      const darkerLightness = getLightness(darkerRgb);

      // Order the colors based on lightness
      const orderedColors = lighterLightness < darkerLightness ? [lighterHex, darkerHex] : [darkerHex, lighterHex];

      return orderedColors;
    };

    let encode = (string) => {
      return encodeURI(string).replace("#", "%23");
    };
    let extractHexFromString = (string) => {
      return string.match(/#(?:[0-9a-fA-F]{3}){1,2}\b/g);
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

                  let processImage = async (resizedImageBuffer) => {
                    await ColorThief.getPalette(resizedImageBuffer, 5)
                      .then(async (palette) => {
                        let hex = palette.map((x) => rgbToHex(x));
                        if (appearance === "ai") {
                          showToast({
                            style: Toast.Style.Animated,
                            title: "Choosing Light or Dark",
                            message: "Using Raycast AI to generate your Theme",
                          });
                          appearance = await AI.ask(
                            `Based on this palette: [${hex.join(
                              ","
                            )}], decide whether this is a *LIGHT* or *DARK THEMED* *PALETTE*. *RETURN* "light" for *LIGHT* and "dark" for *DARK*. Return *NOTHING ELSE*.`,
                            { creativity: 2 }
                          ).then((response) => (response.match(/\b(light|dark)\b/i) || ["light"])[0].toLowerCase());
                        }
                        showToast({
                          style: Toast.Style.Animated,
                          title: "Generating Background",
                          message: "Using Raycast AI to generate your Theme",
                        });
                        let bgLight, bgDark;
                        if (appearance === "light") {
                          [bgLight, bgDark] = await AI.ask(
                            `For a *LIGHT COLORED COLOR PALETTE*, choose a *VISUALLY LIGHTER* \`backgroundLight\` and a *VISUALLY DARKER* \`backgroundDark\` for the background colors, based on this palette: [${hex.join(
                              ","
                            )}]. Make them *VERY CLOSE TO EACH OTHER*, *MOSTLY WHITE AND DULL*, but still with a *HINT OF COLOR*. You may *MODIFY the COLORS* to make them lighter. *ENSURE* the colors are *VISUALLY APPEALING*. ${
                              values.descriptionBg ? "Here are some extra instructions: " + values.descriptionBg : ""
                            }Return your answer as *TWO HEX STRINGS*, separated with *a SPACE*. Return \`backgroundLight\` first, and \`backgroundDark\` second.`,
                            { creativity: 1 }
                          ).then((response) => {
                            if (extractHexFromString(response).length) {
                              return orderHexColors(...extractHexFromString(response)).map((x) => encode(x));
                            } else {
                              return ["#FFFFFF", "#FFFFFF"];
                            }
                          });
                        } else {
                          [bgLight, bgDark] = await AI.ask(
                            `For a *DARK THEMED COLOR PALETTE*, choose a *VISUALLY LIGHTER* \`backgroundLight\` and a *VISUALLY DARKER* \`backgroundDark\` for the background colors, based on this palette: [${hex.join(
                              ", "
                            )}]. Make them *CLOSE TO EACH OTHER*, *MOSTLY DARK AND DULL*, but still with a *HINT OF COLOR*. You may *MODIFY the COLORS* to make them *MORE FITTING*. *ENSURE* the colors are *VISUALLY APPEALING*. Return your answer as *TWO HEX STRINGS*, separated with *a SPACE*. Return \`backgroundLight\` first, and \`backgroundDark\` second.`,
                            { creativity: 1 }
                          ).then((response) => {
                            if (extractHexFromString(response).length) {
                              return orderHexColors(...extractHexFromString(response)).map((x) => encode(x));
                            } else {
                              return ["#030303", "#030303"];
                            }
                          });
                        }
                        console.log("BACKGROUND COLORS", bgLight, bgDark);

                        showToast({
                          style: Toast.Style.Animated,
                          title: "Generating Text Color",
                          message: "Using Raycast AI to generate your Theme",
                        });
                        let text = await AI.ask(
                          `MODIFY ONE OF THESE COLORS [${hex.join(
                            ","
                          )}] to get it to MAX CONTRAST on these two colors: ${bgLight} and ${bgDark}. It should be EASILY VISIBLE. Return your answer as a *SINGLE HEX STRING*. Do *NOT* return anything else.`,
                          { creativity: 1 }
                        ).then((response) =>
                          encode(
                            (extractHexFromString(response) || (appearance === "light" ? ["#0D0D0D"] : ["#F2F2F2"]))[0]
                          )
                        );
                        console.log("TEXT COLOR", text);
                        showToast({
                          style: Toast.Style.Animated,
                          title: "Generating Highlight",
                          message: "Using Raycast AI to generate your Theme",
                        });
                        let highlight = await AI.ask(
                          `Generate a *HIGHLIGHT COLOR* that *LOOKS GOOD* on *BOTH* of these colors: ${bgLight} and ${bgDark}. Make it *BASED ON* this *PALETTE*: [${hex.join(
                            ","
                          )}], but still *AS BRIGHT* and *POPPING AS POSSIBLE*. Return your answer as a *SINGLE HEX STRING*. Do *NOT* return anything else.`,
                          { creativity: 1 }
                        ).then((response) =>
                          encode(
                            (extractHexFromString(response) || (appearance === "light" ? ["#030303"] : ["#FFFFFF"]))[0]
                          )
                        );
                        console.log("HIGHLIGHT COLOR", highlight);
                        showToast({
                          style: Toast.Style.Animated,
                          title: "Generating Support Colors",
                          message: "Using Raycast AI to generate your Theme",
                        });
                        let red, orange, yellow, green, blue, purple, magenta;

                        if (appearance === "light") {
                          [red, orange, yellow, green, blue, purple, magenta] = [
                            "%23F50A0A",
                            "%23F5600A",
                            "%23E0A200",
                            "%2307BA65",
                            "%230A7FF5",
                            "%23470AF5",
                            "%23F50AA3",
                          ];
                          if (values.genSupport) {
                            [red, orange, yellow, green, blue, purple, magenta] = await AI.ask(
                              `MODIFY these COLORS IF NECESSARY so that they LOOK GOOD and HAVE GOOD CONTRAST on BOTH of these colors: ${bgLight} and ${bgDark}. Red (#F50A0A), orange (#F5600A), yellow (#E0A200), green (#07BA65), blue (#0A7FF5), purple (#470AF5), and magenta (#F50AA3). Give your new colors in a comma separated list, in this order: red, orange, yellow, green, blue, purple, magenta. Do not provide anything BEFORE, or AFTER.`,
                              { creativity: 1 }
                            ).then((response) => extractHexFromString(response).map((x) => encode(x.trim())));
                          }
                        } else {
                          [red, orange, yellow, green, blue, purple, magenta] = [
                            "%23F84E4E",
                            "%23F88D4E",
                            "%23FFCC47",
                            "%234EF8A7",
                            "%23228CF6",
                            "%237B4EF8",
                            "%23F84EBD",
                          ];
                          if (values.genSupport) {
                            [red, orange, yellow, green, blue, purple, magenta] = await AI.ask(
                              `MODIFY these COLORS IF NECESSARY so that they LOOK GOOD and HAVE GOOD CONTRAST on BOTH of these colors: ${bgLight} and ${bgDark}. Red (#F84E4E), orange (#F88D4E), yellow (#FFCC47), green (#4EF8A7), blue (#228CF6), purple (#7B4EF8), and magenta (#F84EBD). Give your new colors in a comma separated list, in this order: red, orange, yellow, green, blue, purple, magenta. Do not provide anything BEFORE, or AFTER.`,
                              { creativity: 1 }
                            ).then((response) => extractHexFromString(response).map((x) => encode(x.trim())));
                          }
                        }
                        console.log("SUPPORT COLORS", red, orange, yellow, green, blue, purple, magenta);

                        if (!name) {
                          showToast({
                            style: Toast.Style.Animated,
                            title: "Generating Title",
                            message: "Using Raycast AI to generate a Title for your Theme",
                          });
                          name = await AI.ask(
                            `Given the following colors: [${bgDark}, ${bgLight}, ${text}, ${highlight}], name this palette. Use 1-2 words, and more only if necessary. Some example names are "White Flames", "Bright Lights", "Burning Candle". Keep in mind this is a ${appearance} theme, so adapt the title to it. ${
                              values.descriptionTitle
                                ? "Here are extra instructions to consider ON TOP OF all previous instructions: " +
                                  values.descriptionTitle
                                : ""
                            } DO NOT include ANYTHING BEFORE OR AFTER THE TITLE, including QUOTATION MAKRS, PERIODS, or ANY OTHER PUNCTUATION`,
                            { creativity: values.themeCreativity }
                          ).then((response) => encode(response.replace(".", "").trim()));
                        }
                        console.log("TITLE", name);
                        console.log(
                          `raycast://theme?version=1&name=${name}&appearance=${appearance}&colors=${bgDark},${bgLight},${text},${highlight},${highlight},${red},${orange},${yellow},${green},${blue},${purple},${magenta}`
                        );
                        open(
                          `raycast://theme?version=1&name=${name}&appearance=${appearance}&colors=${bgDark},${bgLight},${text},${highlight},${highlight},${red},${orange},${yellow},${green},${blue},${purple},${magenta}`
                        );
                      })
                      .catch((e) => {
                        console.error(e);
                        showToast({
                          style: Toast.Style.Failure,
                          title: "Generation Failed",
                          message: "Try again, and submit an issue if it fails again.",
                        });
                      });
                  };

                  await Jimp.read(image).then(async (image) => {
                    return image
                      .resize(1920, 1080)
                      .getBufferAsync(Jimp.MIME_PNG)
                      .then(async (resizedImageBuffer) => {
                        await processImage(resizedImageBuffer);
                      });
                  });
                  popToRoot();
                } catch (e) {
                  console.error(e);
                  showToast({
                    style: Toast.Style.Failure,
                    title: "Generation Failed",
                    message: "Try again, and submit an issue if it fails again." + e,
                  });
                  popToRoot();
                }
              }}
            />
          </ActionPanel>
        }
      >
        <Form.Description
          title="Image"
          text="The image Colorify uses to generate your theme.
Only bitmap images less than 4k are accepted."
        />
        <Form.FilePicker
          id="image"
          title=""
          allowMultipleSelection={false}
          error={imageError}
          onChange={dropImageErrorIfNeeded}
          onBlur={(event) => {
            if (event.target.value?.length === 0) {
              setImageError("Please choose an image to use.");
            } else {
              if (event.target.value[0]) {
                sizeOf(event.target.value[0], function (_, dim) {
                  if (dim.width > 4096 || dim.height > 4096) {
                    setImageError("Please keep the image under 4096x4096");
                  }
                });
              }
              dropImageErrorIfNeeded();
            }
          }}
        />
        <Form.Description title="Theme Name" text="Optional. Leave blank for AI-generated name." />
        <Form.TextField id="themeName" placeholder="Name your theme..." />

        <Form.Description
          title="Theme Type"
          text="Create a Light Theme, Dark Theme, or Auto (Use AI to automatically decide the theme type)"
        />
        <Form.Dropdown id="appearance" defaultValue="ai">
          <Form.Dropdown.Item value="ai" title="Auto" />
          <Form.Dropdown.Item value="light" title="Light Theme" />
          <Form.Dropdown.Item value="dark" title="Dark Theme" />
        </Form.Dropdown>
        <Form.Description
          title="Advanced Options"
          text="Changing these options may cause the extension to break or not function properly. Continue cautiously."
        />
        <Form.Checkbox id="showAdvanced" value={showAdvanced} label="Show" onChange={setShowAdvanced} />
        {showAdvanced && (
          <>
            <Form.Separator />
            <Form.Description
              title="Generate Supports"
              text="Whether or not to modify the red, orange, green, blue, purple, and magenta color of the theme. Uses default light or dark values otherwise."
            />

            <Form.Checkbox id="genSupport" label="Generate" defaultValue={true} />
            <Form.Description
              title="Title Creativity"
              text="Choose the creativity used in the Theme Title generation."
            />

            <Form.Dropdown id="themeCreativity" defaultValue="none">
              <Form.Dropdown.Item value="none" title="Precise" />
              <Form.Dropdown.Item value="low" title="Low Creativity" />
              <Form.Dropdown.Item value="medium" title="Medium Creativity" />
              <Form.Dropdown.Item value="high" title="High Creativity" />
              <Form.Dropdown.Item value="maximum" title="Max Creativity" />
            </Form.Dropdown>
          </>
        )}
        <Form.Separator />
        <Form.Description
          title="Disclaimer"
          text="Colorify uses AI to enhance colors extracted from your image. This may result in poor results in many cases, such as images with a large range of colors.
          
Using too many AI features may result in rate limiting. Please use them sparingly.
          "
        />
      </Form>
    );
  }
}
