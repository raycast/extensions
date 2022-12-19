import { open, Form, ActionPanel, Action, showToast, showHUD } from "@raycast/api";
import puppeteer, { BoundingBox, ElementHandle } from "puppeteer";
import { tmpdir } from "os";
import { ulid } from "ulid";
import { useState } from "react";
import { execa } from "execa";
import definition from "../assets/map.json";

type Values = {
  code: string;
  copy: boolean;
  language: string;
  theme: string;
  font: string;
};

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);

  const baseURL = "https://carbon.now.sh";

  async function handleSubmit(values: Values) {
    setIsLoading(true);

    let queryParam = "?";
    for (const [key, value] of Object.entries(values)) {
      if (key == "copy") {
        continue;
      }

      queryParam = `${queryParam}&${key}=${encodeURIComponent(value)}`;
    }

    const url = baseURL + queryParam;

    const browser = await puppeteer.launch({
      headless: true,
    });

    const page = await browser.newPage();

    await page.setViewport({
      width: 1600,
      height: 1000,
      deviceScaleFactor: 2,
    });

    await page.goto(url, {
      waitUntil: "load",
    });

    const downloadPath = tmpdir() + "/" + ulid() + ".png";

    const container: ElementHandle = (await page.waitForSelector("#export-container")) as ElementHandle;
    const bounds: BoundingBox = (await container?.boundingBox()) as BoundingBox;

    await container.screenshot({
      path: downloadPath,
      clip: {
        ...bounds,
        x: Math.round(bounds.x),
        height: Math.round(bounds.height) - 1,
      },
    });

    await browser.close();

    if (values.copy) {
      // https://www.noodlesoft.com/forums/viewtopic.php?f=4&t=4394
      await execa(`osascript -e 'tell app "Finder" to set the clipboard to ( POSIX file "${downloadPath}" )'`, [], {
        shell: true,
      });

      showHUD("Image copied to clipboard");
      showToast({ title: "Screenshot generated", message: "File was successfully generated" });
      setIsLoading(false);
      return;
    }

    open(downloadPath);

    setIsLoading(false);
    showToast({ title: "Screenshot generated", message: "File was successfully generated" });
    setIsLoading(false);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <Form.Description text="This form creates a beautiful screenshot using carbon..now.sh service" />
      <Form.TextArea id="code" title="Code" placeholder="Paste codebase here" />
      <Form.Separator />
      <Form.Checkbox id="copy" label="Copy image to clipboard instead" />
      <Form.Separator />
      <Form.Dropdown id="language" title="Programming language">
        {Object.entries(definition.languages).map((value, key) => {
          return <Form.Dropdown.Item key={key} value={value[1]} title={value[0]} />;
        })}
      </Form.Dropdown>
      <Form.Dropdown id="theme" title="Syntax theme">
        {Object.entries(definition.theme).map((value, key) => {
          return <Form.Dropdown.Item key={key} value={value[1]} title={value[0]} />;
        })}
      </Form.Dropdown>
      <Form.Dropdown id="font" title="Font family">
        {Object.entries(definition.font).map((value, key) => {
          return <Form.Dropdown.Item key={key} value={value[1]} title={value[0]} />;
        })}
      </Form.Dropdown>
    </Form>
  );
}
