import {
  open,
  Form,
  ActionPanel,
  Action,
  showToast,
  showHUD,
  getPreferenceValues,
  Clipboard,
  Icon,
} from "@raycast/api";
import puppeteer, { BoundingBox, ElementHandle } from "puppeteer";
import { tmpdir } from "os";
import { ulid } from "ulid";
import { useEffect, useRef, useState } from "react";
import { execa } from "execa";
import definition from "../assets/map.json";

type Values = {
  code: string;
  copy: boolean;
  language: string;
  theme: string;
  font: string;
};

interface Preferences {
  paste: string;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);

  const codeFieldRef = useRef<Form.TextArea>(null);

  const baseURL = "https://carbon.now.sh";

  const preferences = getPreferenceValues<Preferences>();
  const [code, setCode] = useState<string>("");
  const [codeError, setCodeError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!preferences.paste) {
      return;
    }

    const text = Clipboard.readText();
    text
      .then((val: string | undefined) => {
        if (val === undefined) {
          return;
        }

        setCode(val as string);
      })
      .catch(console.log);
  });

  async function handleSubmit(values: Values) {
    setIsLoading(true);

    if (values.code.trim().length === 0) {
      setCodeError("This field is required");
      setIsLoading(false);
      return;
    }

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

    codeFieldRef.current?.reset();

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
          <Action.SubmitForm icon={Icon.Snippets} onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <Form.Description text="This form creates a beautiful screenshot using carbon.now.sh service" />
      <Form.TextArea
        error={codeError}
        id="code"
        title="Code"
        placeholder="Paste codebase here"
        ref={codeFieldRef}
        value={code}
      />
      <Form.Separator />
      <Form.Checkbox id="copy" label="Copy Image to Clipboard Instead" />
      <Form.Separator />
      <Form.Dropdown id="language" title="Programming Language">
        {Object.entries(definition.languages).map((value, key) => {
          return <Form.Dropdown.Item key={key} value={value[1]} title={value[0]} />;
        })}
      </Form.Dropdown>
      <Form.Dropdown id="theme" title="Syntax Theme">
        {Object.entries(definition.theme).map((value, key) => {
          return <Form.Dropdown.Item key={key} value={value[1]} title={value[0]} />;
        })}
      </Form.Dropdown>
      <Form.Dropdown id="font" title="Font Family">
        {Object.entries(definition.font).map((value, key) => {
          return <Form.Dropdown.Item key={key} value={value[1]} title={value[0]} />;
        })}
      </Form.Dropdown>
    </Form>
  );
}
