import { ActionPanel, Action, Detail } from "@raycast/api";
import { useState } from "react";
import { Deal, getDetails, DealDetails, DealDetailsMetadata, DealDetailsPrice, DealDetailsDLC } from "./networking";
import { getEntryURL } from "./util";

interface DetailState {
  isLoading: boolean;
  fetched: boolean;
  markdown?: string;
  metadata?: JSX.Element;
}

const dealMarkdown = (deal: Deal, details?: DealDetails): string => `
# ${deal.name}
<img src="${details?.imageURL ?? ""}" />
${details?.description ?? ""}
`;

const MetadataPriceEntry = (price: DealDetailsPrice): JSX.Element => {
  const title = price.version ? `${price.store} (${price.version})` : price.store;
  return <Detail.Metadata.Label key={price.store} title={title} text={price.price} />;
};

const MetadataEntry = (metadata: DealDetailsMetadata): JSX.Element => {
  switch (typeof metadata.value) {
    case "string": {
      const text = metadata.value as string;
      return <Detail.Metadata.Label key={metadata.key} title={metadata.key} text={text} />;
    }
    case "object": {
      const values = metadata.value as string[];
      return (
        <Detail.Metadata.TagList key={metadata.key} title={metadata.key}>
          {values.map((v) => (
            <Detail.Metadata.TagList.Item key={v} text={v} />
          ))}
        </Detail.Metadata.TagList>
      );
    }
  }
};

const MetadataDLCEntry = (dlc: DealDetailsDLC): JSX.Element => (
  <Detail.Metadata.Label key={dlc.name} title={dlc.name} text={dlc.price} />
);

const DealMetadata = (deal: Deal, details?: DealDetails): JSX.Element | undefined => {
  if (!details) return;
  return (
    <Detail.Metadata>
      {details.prices?.map((p) => MetadataPriceEntry(p))}
      <Detail.Metadata.Separator />
      {details.metadata?.map((m) => MetadataEntry(m))}
      <Detail.Metadata.Separator />
      {details.dlcs?.map((d) => MetadataDLCEntry(d))}
    </Detail.Metadata>
  );
};

const Details = (deal: Deal): JSX.Element => {
  const [state, setState] = useState<DetailState>({
    isLoading: true,
    fetched: false,
  });
  if (!state.fetched) {
    getDetails(deal).then((d) => {
      const markdown = dealMarkdown(deal, d);
      const metadata = DealMetadata(deal, d);
      setState({ isLoading: false, fetched: true, markdown, metadata });
    });
  }

  const actions = (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.OpenInBrowser url={getEntryURL(deal)} />
      </ActionPanel.Section>
    </ActionPanel>
  );

  return (
    <Detail
      navigationTitle={deal.name}
      isLoading={state.isLoading}
      markdown={state.markdown}
      metadata={state.metadata}
      actions={actions}
    />
  );
};

export default Details;
