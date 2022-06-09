import { ActionPanel, Form, Icon, showToast, Toast, Action, showInFinder, closeMainWindow } from "@raycast/api";
import { chromium } from "playwright";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { URL } from "node:url";
import { setTimeout } from "timers/promises";

export default function Command() {
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
        title="Your website"
        placeholder="Enter here the address of the site you want to screenshot..."
      />
    </Form>
  );
}

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
        webSite = "http://" + values.website;
      } else {
        webSite = values.website;
      }

      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto(webSite);
      const buffer = await page.screenshot({ fullPage: true });

      const webSiteUrl = new URL(webSite);
      const timeStamp = Date.now();
      const imageName = webSiteUrl.hostname+'_'+timeStamp+'.png';

      const base64Img = buffer.toString("base64");
      const outputFile = desktopdir(imageName);
      await writeFile(outputFile, base64Img, "base64");

      await browser.close();

      toast.style = Toast.Style.Success;
      toast.title = "Took screenshot of website";
      toast.message = "Look for it on the desktop"
      toast.primaryAction = {
        title: "Show in Finder",
        onAction: async () => {
          await showInFinder(outputFile);
        },
      };
      await setTimeout(2000);
      await closeMainWindow({ clearRootSearch: true });

    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed taking screenshot of website";
      toast.message = String(error);
    }
  }

  return <Action.SubmitForm icon={Icon.Window} title="Take Screenshot" onSubmit={handleSubmit} />;
}

function desktopdir(...paths: string[]) {
  return join(homedir(), "Desktop", ...paths);
}