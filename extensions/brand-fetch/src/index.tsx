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
} from "@raycast/api";
import { useEffect, useState } from "react";
import { retrieveBrand, searchBrandKeyword } from "./source";
import { RetrieveBrandResponse, SearchBrandKeyword } from "./source.types";
import { homedir } from "os";
import axios from "axios";
import { writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

const DOWNLOADS_DIR = `${homedir()}/Downloads`;

interface Preferences {
  bfApiKey: string;
}

export default function Command(props: LaunchProps<{ arguments: { query: string } }>) {
  const { bfApiKey } = getPreferenceValues<Preferences>();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resp, setResp] = useState<RetrieveBrandResponse | SearchBrandKeyword[]>();
  const [queryType, setQueryType] = useState("query");

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: error,
      });
    }
  }, [error]);

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
      setError((err as Error).message);
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
          accessories={[{ icon: Icon.ChevronRightSmall }]}
          actions={
            <ActionPanel>
              <Action.Push title="Preview" target={<BrandView bfApiKey={bfApiKey} domain={brand.domain} />} />
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: error,
      });
    }
  }, [error]);

  async function handleSubmit(input: string) {
    try {
      const resp = await retrieveBrand(bfApiKey, input);
      setData(resp);
    } catch (err: unknown) {
      setError((err as Error).message);
    }
    setLoading(false);
  }

  useEffect(() => {
    handleSubmit(domain.replaceAll(/http:|https:|\/\//g, ""));
  }, [domain]);

  async function saveToDownloads(imageUrl: string, extName: string) {
    const filePath = join(DOWNLOADS_DIR, randomUUID() + "." + extName);
    try {
      const { data } = await axios.get(imageUrl, {
        responseType: "arraybuffer",
      });

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
      {(data as RetrieveBrandResponse)?.logos?.flatMap((image, idx) =>
        image.formats.map((format, index) => (
          <Grid.Item
            key={`${idx}-${index}`}
            title={format.format}
            content={{ tooltip: format.format, source: format.src }}
            actions={
              <ActionPanel>
                <Action
                  title="Save to Downloads"
                  onAction={() => saveToDownloads(format.src, format.format)}
                  icon={Icon.Download}
                />
                <Action.OpenInBrowser url={format.src} />
                <Action.CopyToClipboard content={format.src} />
                <Action.CopyToClipboard
                  title="Copy Description"
                  content={data?.description || "description empty"}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        )),
      )}
    </Grid>
  );
}
