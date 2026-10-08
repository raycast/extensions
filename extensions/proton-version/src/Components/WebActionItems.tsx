import { Action, ActionPanel, Icon } from "@raycast/api";
import { PRODUCT_HOME, PRODUCT_TITLE } from "../constantsWeb";
import { ProtonProduct, WebEnv, WebVersion } from "../interface";

interface Props {
  data: WebVersion;
  product: ProtonProduct;
  environment: WebEnv;
}

const releaseTag = (product: ProtonProduct, tag: string) =>
  `https://github.com/ProtonMail/WebClients/releases/tag/${
    encodeURIComponent(product) + encodeURIComponent("@") + encodeURIComponent(tag)
  }`;

const releaseChange = (product: ProtonProduct, tag: string) =>
  `https://github.com/ProtonMail/WebClients/compare/${
    encodeURIComponent(product) + encodeURIComponent("@") + encodeURIComponent(tag)
  }...main`;

const Actions = ({ data, product }: Props) => {
  const githubTagUrl = releaseTag(product, data.version);
  const githubChangeUrl = releaseChange(product, data.version);

  return (
    <ActionPanel>
      <ActionPanel.Section title="GitHub">
        <Action.OpenInBrowser
          title="ProtonMail/WebClients"
          url="https://github.com/ProtonMail/WebClients"
          icon={Icon.House}
        />
        <Action.OpenInBrowser title="Release Link" url={githubTagUrl} icon={Icon.ArrowRight} />
        <Action.OpenInBrowser title="Compare Changes" url={githubChangeUrl} icon={Icon.ArrowCounterClockwise} />
        <Action.Paste title="Copy Version Number" content={data.version} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Access product">
        <Action.OpenInBrowser
          title={`Access ${PRODUCT_TITLE[product]}`}
          url={PRODUCT_HOME[product]}
          icon={Icon.House}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
};

export default Actions;
