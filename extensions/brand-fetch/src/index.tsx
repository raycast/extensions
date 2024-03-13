import { Form, ActionPanel, Action, showToast, getPreferenceValues, Toast, Grid, Clipboard, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { retrieveBrand } from "./source";
import { RetrieveBrandResponse } from "./source.types";
import { homedir } from "os";
import axios from "axios";
import { writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

const DOWNLOADS_DIR = `${homedir()}/Downloads`;

type Values = {
  textfield: string;
};

interface Preferences {
  bfApiKey: string;
}

export default function Command() {
  const { bfApiKey } = getPreferenceValues<Preferences>();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resp, setResp] = useState<RetrieveBrandResponse | undefined>();

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: error,
      });
    }
  }, [error]);

  async function handleSubmit(values: Values) {
    setIsLoading(true);
    try {
      const data = await retrieveBrand(bfApiKey, values.textfield);

      setResp(data);
    } catch (err: unknown) {
      setError((err as Error).message);
    }

    setIsLoading(false);
  }

  async function saveToDownloads(imageUrl: string, extName: string) {
    const filePath = join(DOWNLOADS_DIR, randomUUID() + "." + extName);
    try {
      const { data } = await axios.get(imageUrl, { responseType: "arraybuffer" });

      await writeFile(filePath, data);
      await Clipboard.copy(filePath);

      showToast({
        style: Toast.Style.Success,
        title: `Saved To Downloads!`,
      });
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  }

  return resp == null ? (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <Form.Description text="This form accepts fields required to interact with brand fetch" />
      <Form.TextField id="textfield" title="Brand Domain" placeholder="Enter text" defaultValue="brandfetch.com" />
    </Form>
  ) : (
    <Grid columns={5}>
      {resp.logos?.flatMap((image, idx) =>
        image.formats.map((format, index) => (
          <Grid.Item
            key={`${idx}-${index}`}
            content={{ tooltip: format.format, source: format.src }}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={format.src} />
                <Action.CopyToClipboard content={format.src} />
                <Action
                  title="Save to Downloads"
                  onAction={() => saveToDownloads(format.src, format.format)}
                  icon={Icon.Download}
                />
              </ActionPanel>
            }
          />
        )),
      )}
    </Grid>
  );
}
