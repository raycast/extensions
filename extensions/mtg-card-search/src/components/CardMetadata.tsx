import { Color, Detail } from "@raycast/api";
import { Legality, MtgCardMetadata, Rarity, ScryfallSet } from "../types";
import { capitalize } from "../utils";
import { useFetch } from "@raycast/utils";

const ManaMapping = {
  W: "#F5CF76",
  U: "#4490C3",
  B: "#040301",
  R: "#ED5F67",
  G: "#5DC553",
  default: "#CFC4C2",
} as const;

const RarityMapping: Record<Rarity, string> = {
  [Rarity.Common]: "#191917",
  [Rarity.Uncommon]: "#AACADA",
  [Rarity.Rare]: "#E2CE96",
  [Rarity.Mythic]: "#DB7B3B",
  [Rarity.Special]: "#85699C",
  [Rarity.Bonus]: "#F68624",
  basic: "raycast-primary-text",
} as const;

const legalColorMap: Record<Legality, string> = {
  [Legality.Legal]: Color.Green,
  [Legality.NotLegal]: Color.Red,
  [Legality.Banned]: Color.Red,
  [Legality.Restricted]: Color.Yellow,
} as const;

const formatPrices = (prices: MtgCardMetadata["prices"]) => {
  const formattedPrices: string[] = [];

  if (prices.usd !== null) {
    formattedPrices.push(`$${prices.usd}`);
  }
  if (prices.eur !== null) {
    formattedPrices.push(`€${prices.eur}`);
  }

  return formattedPrices;
};

const formatManaCost = (cost: MtgCardMetadata["manaCost"]): Array<{ value: string; color: string | Color }> => {
  const colorless = cost.match(/(\d+)/g);
  const colored = cost.match(/([WUBRG])/g);

  const formattedCost: Array<{ value: string; color: string | Color }> = [];

  if (colorless) {
    formattedCost.push({ value: colorless.join(""), color: Color.PrimaryText });
  }

  if (colored) {
    for (const color of colored) {
      formattedCost.push({
        value: color,
        color: ManaMapping[color as keyof typeof ManaMapping] ?? ManaMapping.default,
      });
    }
  }

  return formattedCost;
};

interface Props {
  metadata: MtgCardMetadata;
}

export default function CardMetadata({ metadata }: Props) {
  const { data: scryfallSet } = useFetch<ScryfallSet>(metadata.set.uri);

  const pricesList = formatPrices(metadata.prices);
  const mana = formatManaCost(metadata.manaCost);

  return (
    <Detail.Metadata>
      <Detail.Metadata.Label
        title="Set"
        text={metadata.set.name}
        icon={{
          source: scryfallSet?.icon_svg_uri ?? "",
          tintColor: Color.PrimaryText,
        }}
      />
      {metadata.manaCost.length > 0 && (
        <Detail.Metadata.TagList title="Mana Cost">
          {mana.map((t, index) => (
            <Detail.Metadata.TagList.Item key={[t.value, t.color, index].join("-")} color={t.color} text={t.value} />
          ))}
        </Detail.Metadata.TagList>
      )}
      <Detail.Metadata.TagList title="Rarity">
        <Detail.Metadata.TagList.Item color={RarityMapping[metadata.rarity]} text={capitalize(metadata.rarity)} />
      </Detail.Metadata.TagList>
      {metadata.keywords.length > 0 && (
        <Detail.Metadata.TagList title="Keywords">
          {metadata.keywords.map((t) => (
            <Detail.Metadata.TagList.Item key={t} text={t} />
          ))}
        </Detail.Metadata.TagList>
      )}
      <Detail.Metadata.TagList title="Price">
        {pricesList.map((t, index) => (
          <Detail.Metadata.TagList.Item key={t + index} text={t} />
        ))}
      </Detail.Metadata.TagList>
      <Detail.Metadata.TagList title="Legality">
        {metadata.gameChanger && <Detail.Metadata.TagList.Item text="⚠️ EDH Game Changer" color={Color.Yellow} />}
        {Object.entries(metadata.legalities).map(([format, legal]) => (
          <Detail.Metadata.TagList.Item key={format} text={capitalize(format)} color={legalColorMap[legal]} />
        ))}
      </Detail.Metadata.TagList>
      <Detail.Metadata.Label title="Artist" text={metadata.artist} icon="🎨" />
    </Detail.Metadata>
  );
}
