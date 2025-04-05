import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import type { MtgCard } from "../types";
import { capitalize } from "../utils";
import CardMetadata from "./CardMetadata";

interface MarkdownProps {
  name: string;
  traits: string;
  imageUrl: string;
  text: string;
  flavor: string | undefined;
  addSeparator?: boolean;
}

const MARKETS: Array<keyof MtgCard["links"]> = ["scryfall", "edhrec", "cardMarket", "tcgPlayer", "cardHoarder"];

const formatCardActions = (urls: MtgCard["links"]) => {
  return MARKETS.reduce<{ title: string; url: string }[]>((acc, market) => {
    if (urls[market]) {
      acc.push({ title: `Search in ${capitalize(market)}`, url: urls[market] });
    }

    return acc;
  }, []);
};

const addCardFaceMD = (options: MarkdownProps): string => {
  const { name, traits, imageUrl, text, flavor, addSeparator = false } = options;

  return `
  ${addSeparator ? "---" : ""}

  # ${name}  

  ![${name}](${imageUrl}?raycast-width=350&raycast-height=300)

  ${traits}

  \`\`\`text
  ${text.replaceAll(/\n/g, "\n\n")}
  \`\`\`

  >${flavor ?? ""}
  `;
};

export default function CardDetail({ card }: { card: MtgCard }) {
  const markdown = card.faces.map(addCardFaceMD).join("\n\n---\n\n");

  const cardActions = formatCardActions(card.links);

  return (
    <Detail
      key={card.id}
      markdown={markdown}
      navigationTitle={card.fullName}
      metadata={<CardMetadata metadata={card.metadata} />}
      actions={
        <ActionPanel>
          {cardActions.map(({ title, url }) => (
            <Action.OpenInBrowser key={url} url={url} title={title} />
          ))}
          <Action.CopyToClipboard title="Copy Card Name" icon={Icon.CopyClipboard} content={card.fullName} />
        </ActionPanel>
      }
    />
  );
}
