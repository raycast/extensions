import {
  ActionPanel,
  Action,
  showToast,
  getPreferenceValues,
  Toast,
  Grid,
  Clipboard,
  Icon,
  LaunchProps,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { retrieveBrand } from "./source";
import { RetrieveBrandResponse } from "./source.types";
import { homedir } from "os";
import axios from "axios";
import { writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

const DOWNLOADS_DIR = `${homedir()}/Downloads`;

interface Preferences {
  bfApiKey: string;
}

export default function Command(props: LaunchProps<{ arguments: Arguments.Index }>) {
  const { bfApiKey } = getPreferenceValues<Preferences>();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resp, setResp] = useState<RetrieveBrandResponse>();

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: error,
      });
    }
  }, [error]);

  async function handleSubmit(text: string) {
    setIsLoading(true);
    try {
      const data = await retrieveBrand(bfApiKey, text);
      setResp(data);
    } catch (err: unknown) {
      setError((err as Error).message);
    }

    setIsLoading(false);
  }

  useEffect(() => {
    handleSubmit(props.arguments.domain);
  }, [props.arguments.domain]);

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

  return (
    <Grid columns={5} isLoading={isLoading}>
      {resp?.logos?.flatMap((image, idx) =>
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
