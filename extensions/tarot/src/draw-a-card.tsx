import { Detail, Color } from "@raycast/api";
import React from "react";
import { drawCards } from "./hooks/hook";

export default function Main() {
  const { cards, isLoading } = drawCards(1);

  cards &&
    cards.forEach((card) => {
      card.type = toCamelCase(card.type);
      if (card.suit) {
        card.suit = toCamelCase(card.suit);
      }
    });

  const getMarkdown = () =>
    cards
      ? cards
          .map((card) => {
            return `
     \n<img src="${card.imgUrl}" width="300" />
    `;
          })
          .join("")
      : "";

  const getCardName = (length: number, index: number) => {
    return length > 1 ? `Card ${index + 1}` : "Card";
  };

  return (
    <Detail
      isLoading={isLoading}
      markdown={getMarkdown()}
      navigationTitle="Draw a Card"
      metadata={
        <Detail.Metadata>
          {cards &&
            cards.map((card, index) => {
              return (
                <React.Fragment key={index}>
                  <Detail.Metadata.Label title={getCardName(cards.length, index)} text={card.name} />
                  <Detail.Metadata.TagList title="Type">
                    <Detail.Metadata.TagList.Item text={`${card.type}`} color={Color.Yellow} />
                    {card.suit && <Detail.Metadata.TagList.Item text={`${card.suit}`} color={Color.Purple} />}
                  </Detail.Metadata.TagList>
                  <Detail.Metadata.Label title="Description" text={card.desc} />
                  <Detail.Metadata.Label title="Meaning Up" text={card.meaningUp} />
                  <Detail.Metadata.Label title="Meaning Reverse" text={card.meaningRev} />
                  <Detail.Metadata.Link
                    title="More"
                    target={`https://www.google.com/search?q=${card.name}`}
                    text="Google this card"
                  />
                  <Detail.Metadata.Separator />
                </React.Fragment>
              );
            })}
        </Detail.Metadata>
      }
    />
  );
}

function toCamelCase(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
