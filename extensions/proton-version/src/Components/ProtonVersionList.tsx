import { Action, ActionPanel, List, Icon } from "@raycast/api";
import { GITHUB_HOME, PROTON_GITHUB_RELEASE_CHANGE, PROTON_GITHUB_RELEASE_TAG } from "../constants";
import { getAssetFromProduct } from "../helpers/getAssetFromProduct";
import { getKeywordsFromProduct } from "../helpers/getKeywordsFromProduct";
import { getProductNameFromProduct } from "../helpers/getProductNameFromProduct";
import { getProductUrlFromProduct } from "../helpers/getProductUrlFromProduct";
import { ProtonEnv, ProtonProduct, Version } from "../interface";

interface Props {
  data?: Version;
  product: ProtonProduct;
  environment: ProtonEnv;
}

const ProtonVersionList = ({ data, product, environment }: Props) => {
  if (!data) {
    return (
      <List.Item
        title={getProductNameFromProduct(product)}
        icon={{ source: getAssetFromProduct(product) }}
        keywords={getKeywordsFromProduct(product)}
        subtitle="Loading..."
      />
    );
  }

  const title = `${data.version} ${environment === "beta" ? "β" : ""}`;
  const githubTagUrl = PROTON_GITHUB_RELEASE_TAG(product, data.version);
  const githubChangeUrl = PROTON_GITHUB_RELEASE_CHANGE(product, data.version);
  const date = new Date(data.date);

  return (
    <List.Item
      title={getProductNameFromProduct(product)}
      icon={{ source: getAssetFromProduct(product) }}
      subtitle={title}
      accessories={[{ date: date, tooltip: `Deployed Date: ${date.toLocaleString()}` }]}
      keywords={getKeywordsFromProduct(product)}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="GitHub">
            <Action.OpenInBrowser title="ProtonMail/WebClients" url={GITHUB_HOME} icon={Icon.House} />
            <Action.OpenInBrowser title="Release Link" url={githubTagUrl} icon={Icon.ArrowRight} />
            <Action.OpenInBrowser title="Compare Changes" url={githubChangeUrl} icon={Icon.ArrowCounterClockwise} />
            <Action.Paste title="Copy Version Number" content={data.version ?? ""} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Access product">
            <Action.OpenInBrowser
              title={`Access ${getProductNameFromProduct(product)}`}
              url={getProductUrlFromProduct(product)}
              icon={Icon.House}
              shortcut={{ modifiers: ["cmd"], key: "p" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

export default ProtonVersionList;
