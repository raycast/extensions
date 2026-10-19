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
  List,
  Keyboard,
  showInFinder,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { retrieveBrand, searchBrandKeyword } from "./source";
import { RetrieveBrandResponse, SearchBrandKeyword } from "./source.types";
import { homedir } from "node:os";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { failToast, showError } from "@chrismessina/raycast-kit";

const DOWNLOAD_DIR = `${homedir()}/Downloads`;

interface Preferences {
  bfApiKey: string;
  downloadPath?: string;
}

export default function Command(props: LaunchProps<{ arguments: { query: string } }>) {
  const { bfApiKey } = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(false);
  const [resp, setResp] = useState<RetrieveBrandResponse | SearchBrandKeyword[]>();
  const [queryType, setQueryType] = useState("query");

  async function handleSubmit(input: string) {
    setIsLoading(true);
    try {
      let data;

      const urlPattern = new RegExp("(https?:\\/\\/)?([a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,}(:\\d+)?(\\/.*)?");
      if (urlPattern.test(input)) {
        setQueryType("domain");
      } else {
        data = await searchBrandKeyword(input);
      }

      setResp(data);
    } catch (err: unknown) {
      await showError(err, { title: "Failed to search brands" });
    }

    setIsLoading(false);
  }

  useEffect(() => {
    handleSubmit(props.arguments.query);
  }, [props.arguments.query]);

  return queryType === "domain" ? (
    <BrandView bfApiKey={bfApiKey} domain={props.arguments.query} />
  ) : (
    <List isLoading={isLoading}>
      {(resp as SearchBrandKeyword[])?.map((brand) => (
        <List.Item
          key={brand.brandId}
          title={brand.name || brand.domain}
          subtitle={brand.domain}
          icon={brand.icon || Icon.Warning}
          actions={
            <ActionPanel>
              <Action.Push
                title="Browse"
                icon={Icon.Image}
                target={<BrandView bfApiKey={bfApiKey} domain={brand.domain} />}
              />
              <Action.OpenInBrowser url={`https://brandfetch.com/${brand.domain}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function BrandView({ domain, bfApiKey }: { domain: string; bfApiKey: string }) {
  const [data, setData] = useState<RetrieveBrandResponse | null>(null);
  const [isLoading, setLoading] = useState(true);

  async function handleSubmit(input: string) {
    try {
      const resp = await retrieveBrand(bfApiKey, input);
      setData(resp);
    } catch (err: unknown) {
      await showError(err, { title: "Failed to load brand" });
    }
    setLoading(false);
  }

  useEffect(() => {
    handleSubmit(domain.replaceAll(/http:|https:|\/\//g, ""));
  }, [domain]);

  async function download(imageUrl: string, extName: string) {
    const { downloadPath } = getPreferenceValues<Preferences>();
    const configuredPath = downloadPath?.trim() || DOWNLOAD_DIR;
    const directory = configuredPath.replace(/^~(?=$|[\\/])/, homedir());
    const filePath = join(directory, randomUUID() + "." + extName);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Downloading image…",
    });

    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image (${response.status})`);
      }
      const data = Buffer.from(await response.arrayBuffer());

      await writeFile(filePath, data);
      await Clipboard.copy(filePath);

      toast.style = Toast.Style.Success;
      toast.title = `Downloaded to ${directory}`;
      toast.primaryAction = {
        title: `Show in ${process.platform === "darwin" ? "Finder" : "File Explorer"}`,
        onAction: () => showInFinder(filePath),
        shortcut: Keyboard.Shortcut.Common.OpenWith,
      };
    } catch (err: unknown) {
      failToast(toast, err, { title: "Failed to download image" });
    }
  }

  return (
    <Grid columns={5} isLoading={isLoading}>
      {(data as RetrieveBrandResponse)?.logos?.flatMap((image, idx) =>
        image.formats.map((format, index) => (
          <Grid.Item
            key={`${idx}-${index}`}
            title={format.format}
            content={{ tooltip: format.format, source: format.src }}
            actions={
              <ActionPanel>
                <Action title="Download" onAction={() => download(format.src, format.format)} icon={Icon.Download} />
                <Action.OpenInBrowser url={format.src} shortcut={Keyboard.Shortcut.Common.Open} />
                <Action.CopyToClipboard content={format.src} shortcut={Keyboard.Shortcut.Common.Copy} />
                <Action.CopyToClipboard
                  title="Copy Description"
                  content={data?.description || "description empty"}
                  shortcut={Keyboard.Shortcut.Common.CopyName}
                />
              </ActionPanel>
            }
          />
        )),
      )}
    </Grid>
  );
}
