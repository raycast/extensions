import { ActionPanel, Detail, Color } from "@raycast/api";
import { ScryfallCard, ScryfallRulings, ScryfallSet } from "../../types";
import { formatRarityName, getCardImage, getMana, getProducedMana, getRarityColor } from "../../util";
import { SharedCardActions } from "../Actions";
import { useFetch } from "@raycast/utils";

interface CardDetailProps {
    card: ScryfallCard;
    isLoading?: boolean;
}

export function CardDetail({ card, isLoading = false }: CardDetailProps) {
    const cardSetIcon = useFetch<ScryfallSet>(card.set_uri).data;
    const cardRulings = useFetch<ScryfallRulings>(card.rulings_uri).data;

    const markdown = `
![](${getCardImage(card)}?raycast-width=350&raycast-height=300)

${card.oracle_text}

${card.flavor_text ? `*${card.flavor_text}*` : ""}

${cardRulings && cardRulings.data.length > 0 ? `### Rulings\n\n ${cardRulings.data.map((ruling) => `*${ruling.published_at}* — ${ruling.comment} \n\n`).join("")}` : ""}
`;

    return (
        <Detail
            markdown={markdown}
            navigationTitle={card.name}
            isLoading={isLoading}
            metadata={
                <Detail.Metadata>
                    {/* Card info */}
                    <Detail.Metadata.Label title="Name" text={card.name} />
                    <Detail.Metadata.Label title="Type" text={card.type_line} />
                    {card.mana_cost.length > 0 && (
                        <Detail.Metadata.TagList title="Mana">
                            {getMana(card)?.map((mana, index) => (
                                <Detail.Metadata.TagList.Item text={mana.symbol} color={mana.color} key={index} />
                            ))}
                        </Detail.Metadata.TagList>
                    )}
                    {card.produced_mana && (
                        <Detail.Metadata.TagList title="Produced Mana">
                            {getProducedMana(card)?.map((mana, index) => (
                                <Detail.Metadata.TagList.Item text={mana.symbol} color={mana.color} key={index} />
                            ))}
                        </Detail.Metadata.TagList>
                    )}
                    <Detail.Metadata.Label title="CMC" text={card.cmc.toString()} />
                    {card.power && (
                        <Detail.Metadata.Label
                            title="Power"
                            text={card.power}
                            icon={{ source: "sword.png", tintColor: Color.PrimaryText }}
                        />
                    )}
                    {card.toughness && (
                        <Detail.Metadata.Label
                            title="Toughness"
                            text={card.toughness}
                            icon={{ source: "shield.png", tintColor: Color.PrimaryText }}
                        />
                    )}
                    {card.keywords.length > 0 && (
                        <>
                            <Detail.Metadata.Separator />
                            <Detail.Metadata.TagList title="Keywords">
                                {card.keywords.map((keyword) => (
                                    <Detail.Metadata.TagList.Item
                                        key={keyword}
                                        text={keyword}
                                        color={Color.PrimaryText}
                                    />
                                ))}
                            </Detail.Metadata.TagList>
                        </>
                    )}
                    {/* Misc info */}
                    <Detail.Metadata.Separator />
                    <Detail.Metadata.Label
                        title="Set"
                        text={card.set_name}
                        icon={{ source: cardSetIcon ? cardSetIcon.icon_svg_uri : "", tintColor: Color.PrimaryText }}
                    />
                    <Detail.Metadata.TagList title="Rarity">
                        <Detail.Metadata.TagList.Item text={formatRarityName(card)} color={getRarityColor(card)} />
                    </Detail.Metadata.TagList>
                    <Detail.Metadata.Label title="Collector Number" text={card.collector_number} />
                    {/* Price info */}
                    {card.prices.usd && (
                        <>
                            <Detail.Metadata.Separator />
                            <Detail.Metadata.TagList title="Prices">
                                <Detail.Metadata.TagList.Item
                                    text={`$${card.prices.usd}`}
                                    color={"raycast-primary-text"}
                                />
                                {card.prices.usd_foil && (
                                    <Detail.Metadata.TagList.Item
                                        text={`Foil: $${card.prices.usd_foil}`}
                                        color={"raycast-primary-text"}
                                    />
                                )}
                            </Detail.Metadata.TagList>
                        </>
                    )}
                    {/* Artist */}
                    <Detail.Metadata.Separator />
                    <Detail.Metadata.Label title="Artist" text={card.artist} />
                    {/* Open */}
                    <Detail.Metadata.Separator />
                    <Detail.Metadata.Link title="Scryfall" target={card.scryfall_uri} text="Open in Browser" />
                </Detail.Metadata>
            }
            actions={
                <ActionPanel>
                    <SharedCardActions card={card} />
                </ActionPanel>
            }
        />
    );
}
