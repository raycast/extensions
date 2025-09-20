import { ActionPanel, Form, Icon, showToast, Toast, Action, showInFinder, getPreferenceValues } from "@raycast/api";
import { chromium } from "playwright";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { URL } from "node:url";
import { useRef } from "react";

export default function Command() {
  const { outputDirectory } = getPreferenceValues<Preferences.ScreenshotFullPage>();
  const urlWebSite = useRef<Form.TextField>(null);

  function ScreenshotFullPageAction() {
    async function handleSubmit(values: { website: string }) {
      if (!values.website) {
        showToast({
          style: Toast.Style.Failure,
          title: "Website is required",
        });
        return;
      }

      const toast = await showToast({ style: Toast.Style.Animated, title: "Taking screenshot of website..." });

      try {
        let webSite;
        if (!values.website.startsWith("http")) {
          webSite = "https://" + values.website;
        } else {
          webSite = values.website;
        }

        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto(webSite);
        const buffer = await page.screenshot({ fullPage: true });

        const webSiteUrl = new URL(webSite);
        const timeStamp = Date.now();
        const imageName = webSiteUrl.hostname + "_" + timeStamp + ".png";

        const base64Img = buffer.toString("base64");
        const outputFile = outputDir(imageName);
        await writeFile(outputFile, base64Img, "base64");

        await browser.close();

        toast.style = Toast.Style.Success;
        toast.title = "Took screenshot of website";
        const msgSuffix = outputDirectory ? `in "${outputDirectory}"` : "on the Desktop";
        toast.message = `Look for it ${msgSuffix}`;
        toast.primaryAction = {
          title: "Show in Finder",
          onAction: async () => {
            await showInFinder(outputFile);
          },
        };

        urlWebSite.current?.reset();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed taking screenshot of website";
        toast.message = String(error);
      }
    }

    return <Action.SubmitForm icon={Icon.Window} title="Take Screenshot" onSubmit={handleSubmit} />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <ScreenshotFullPageAction />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="website"
        title="Website URL"
        ref={urlWebSite}
        placeholder="Enter address of the site you want to screenshot..."
      />
    </Form>
  );
}

function outputDir(...paths: string[]) {
  const { outputDirectory } = getPreferenceValues<Preferences.ScreenshotFullPage>();
  if (outputDirectory) {
    return join(outputDirectory, ...paths);
  }
  return join(homedir(), "Desktop", ...paths);
}
