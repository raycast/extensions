import { ActionPanel, Action, Icon, List, showToast, Toast, Image } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { parse } from "node-html-parser";

type AIModel = {
  provider: string;
  modelName: string;
  modelSlug: string;
  modelUrl: string;
  logoUrl: string | null;
  providerLogos: string[];
  params: { key: string; value: string }[];
};

function resolveUrl(src: string): string | null {
  if (src.startsWith("http")) {
    return src;
  } else if (src.startsWith("/")) {
    return `https://vercel.com${src}`;
  }
  return null;
}

function parseModelsFromHtml(html: string): AIModel[] {
  const root = parse(html);

  const tables = root.querySelectorAll("table");
  const headerTable = tables[1];
  const dataTable1 = tables[2];
  const dataTable2 = tables[3];

  if (!headerTable || !dataTable1 || !dataTable2) {
    throw new Error("Failed to find required tables in the page");
  }

  const headers: string[] = headerTable
    .querySelectorAll("th")
    .map((th) => th.textContent.trim())
    .filter((text) => text.length > 0);

  const rows1 = dataTable1.querySelectorAll("tr");
  const rows2 = dataTable2.querySelectorAll("tr");

  const models: AIModel[] = [];

  for (let i = 0; i < rows1.length; i++) {
    const row1 = rows1[i];
    const link = row1.querySelector('a[href^="/ai-gateway/models/"]');

    if (link) {
      const href = link.getAttribute("href") || "";
      const linkText = link.textContent.trim();

      const parts = linkText.split("/");
      const provider = parts[0] || "";
      const modelName = parts.slice(1).join("/") || "";

      const img = row1.querySelector("img");
      const logoUrl = img ? resolveUrl(img.getAttribute("src") || "") : null;

      const params: { key: string; value: string }[] = [];
      const providerLogos: string[] = [];

      if (rows2[i]) {
        const cells = rows2[i].querySelectorAll("td");

        cells.forEach((cell, colIndex) => {
          const headerName = headers[colIndex] || `col${colIndex}`;

          if (headerName === "Providers") {
            cell.querySelectorAll("img").forEach((providerImg) => {
              const src = providerImg.getAttribute("src") || "";
              const resolvedUrl = resolveUrl(src);
              if (resolvedUrl) {
                providerLogos.push(resolvedUrl);
              }
            });
          } else if (headerName !== "Capabilities") {
            const value = cell.textContent.trim();
            params.push({ key: headerName, value });
          }
        });
      }

      models.push({
        provider,
        modelName,
        modelSlug: linkText,
        modelUrl: `https://vercel.com${href}`,
        logoUrl,
        providerLogos,
        params,
      });
    }
  }

  return models;
}

export default function Command() {
  const { data, isLoading, error } = useFetch("https://vercel.com/ai-gateway/models", {
    parseResponse: async (response): Promise<AIModel[]> => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const html = await response.text();
      return parseModelsFromHtml(html);
    },
    keepPreviousData: true,
  });

  const models = data ?? [];

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to fetch AI Gateway models",
      message: error.message,
    });
  }

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Search AI Gateway models...">
      {!isLoading && models.length === 0 && (
        <List.EmptyView
          icon={Icon.Globe}
          title="No AI Gateway Models Found"
          description={error ? error.message : "Unable to load models from Vercel AI Gateway"}
        />
      )}
      {models.map((model) => (
        <List.Item
          key={model.modelSlug}
          icon={model.logoUrl ? { source: model.logoUrl, mask: Image.Mask.Circle } : Icon.Globe}
          title={model.modelSlug}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Model" text={model.modelName} />
                  <List.Item.Detail.Metadata.Separator />
                  {model.params.map((param, index) => (
                    <List.Item.Detail.Metadata.Label key={index} title={param.key} text={param.value} />
                  ))}
                  <List.Item.Detail.Metadata.Separator />
                  {model.providerLogos.length > 0 && (
                    <List.Item.Detail.Metadata.TagList title="Providers">
                      {model.providerLogos.map((logo, index) => (
                        <List.Item.Detail.Metadata.TagList.Item
                          key={index}
                          icon={{ source: logo, mask: Image.Mask.Circle }}
                        />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  )}
                  <List.Item.Detail.Metadata.Link title="Model Page" target={model.modelUrl} text="Open in Vercel" />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={model.modelUrl} title="Open Model Page" />
              <Action.CopyToClipboard content={model.modelSlug} title="Copy Model Slug" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
