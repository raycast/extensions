import { List } from "@raycast/api";
import {
  availableBalanceCards,
  brandCards,
  captchaCards,
  cards,
  countryCards,
  declinedCards,
  disputedCards,
  fraudulentCards,
  pinCards,
  refundedCards,
  secureCards,
} from "@src/data/cards";
import type { Card as CardType } from "@src/data/cards";
import Card from "@src/components/card";
import { useFrecencySorting } from "@raycast/utils";
import { createCardKey } from "@src/utils/cards";

/**
 * Fill Checkout - Browse and autofill Stripe test cards into checkout forms.
 *
 * Features:
 * - Favorites section showing top 3 most-used cards
 * - Categorized test cards: Brand, Country, Declined, Fraudulent, Disputed, Refunded
 * - Special testing scenarios: Available Balance, 3D Secure, Captcha, PIN
 * - Frecency-based sorting (frequency + recency) for personalized card suggestions
 * - One-click autofill into active browser checkout forms
 *
 * Useful for quickly testing various payment scenarios during development.
 */
const FillCheckout = () => {
  const {
    data: favoriteCards,
    visitItem,
    resetRanking,
  } = useFrecencySorting<CardType>(cards, {
    key: (card) => createCardKey(card),
  });

  return (
    <List>
      <List.Section key="favorites" title="Favorites">
        {favoriteCards.slice(0, 3).map((card) => {
          return (
            <Card
              key={createCardKey(card)}
              card={card}
              showCategory
              visitItem={visitItem}
              resetRanking={resetRanking}
            />
          );
        })}
      </List.Section>

      <List.Section title="Brand" subtitle={brandCards.length.toString()}>
        {brandCards.map((card) => {
          return <Card key={createCardKey(card)} card={card} visitItem={visitItem} resetRanking={resetRanking} />;
        })}
      </List.Section>

      <List.Section title="Country" subtitle={countryCards.length.toString()}>
        {countryCards.map((card) => {
          return <Card key={createCardKey(card)} card={card} visitItem={visitItem} resetRanking={resetRanking} />;
        })}
      </List.Section>

      <List.Section title="Declined" subtitle={declinedCards.length.toString()}>
        {declinedCards.map((card) => {
          return <Card key={createCardKey(card)} card={card} visitItem={visitItem} resetRanking={resetRanking} />;
        })}
      </List.Section>

      <List.Section title="Fraudulent" subtitle={fraudulentCards.length.toString()}>
        {fraudulentCards.map((card) => {
          return <Card key={createCardKey(card)} card={card} visitItem={visitItem} resetRanking={resetRanking} />;
        })}
      </List.Section>

      <List.Section title="Disputed" subtitle={disputedCards.length.toString()}>
        {disputedCards.map((card) => {
          return <Card key={createCardKey(card)} card={card} visitItem={visitItem} resetRanking={resetRanking} />;
        })}
      </List.Section>

      <List.Section title="Refunded" subtitle={refundedCards.length.toString()}>
        {refundedCards.map((card) => {
          return <Card key={createCardKey(card)} card={card} visitItem={visitItem} resetRanking={resetRanking} />;
        })}
      </List.Section>

      <List.Section title="Available Balance" subtitle={availableBalanceCards.length.toString()}>
        {availableBalanceCards.map((card) => {
          return <Card key={createCardKey(card)} card={card} visitItem={visitItem} resetRanking={resetRanking} />;
        })}
      </List.Section>

      <List.Section title="3D Secure" subtitle={secureCards.length.toString()}>
        {secureCards.map((card) => {
          return <Card key={createCardKey(card)} card={card} visitItem={visitItem} resetRanking={resetRanking} />;
        })}
      </List.Section>

      <List.Section title="Captcha" subtitle={captchaCards.length.toString()}>
        {captchaCards.map((card) => {
          return <Card key={createCardKey(card)} card={card} visitItem={visitItem} resetRanking={resetRanking} />;
        })}
      </List.Section>

      <List.Section title="PIN" subtitle={pinCards.length.toString()}>
        {pinCards.map((card) => {
          return <Card key={createCardKey(card)} card={card} visitItem={visitItem} resetRanking={resetRanking} />;
        })}
      </List.Section>
    </List>
  );
};

export default FillCheckout;
