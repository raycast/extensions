import { ActionPanel, Action, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { GameState } from "./types";
import { getHandValue, dealCard, initialDeal, determineWinner, getCardUnicode } from "./utils";

export default function Command() {
  const [gameState, setGameState] = useState<GameState>({
    playerHand: [],
    dealerHand: [],
    deck: [],
    isPlayerTurn: true,
    winner: null,
  });

  useEffect(() => {
    handleNewGame();
  }, []);

  useEffect(() => {
    if (gameState.winner) {
      const timer = setTimeout(() => {
        handleNewGame();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [gameState.winner]);

  const handleHit = () => {
    if (!gameState.isPlayerTurn) return;

    const { newHand, newDeck } = dealCard(gameState.playerHand, gameState.deck);
    const playerValue = getHandValue(newHand);

    if (playerValue > 21) {
      setGameState({ ...gameState, playerHand: newHand, winner: "Dealer" });
      showToast(Toast.Style.Failure, "Bust! You lose. Restarting...");
    } else {
      setGameState({ ...gameState, playerHand: newHand, deck: newDeck });
    }
  };

  const handleStand = () => {
    if (!gameState.isPlayerTurn) return;

    let dealerHand = gameState.dealerHand;
    let deck = gameState.deck;
    let dealerValue = getHandValue(dealerHand);

    while (dealerValue < 17) {
      const { newHand, newDeck } = dealCard(dealerHand, deck);
      dealerHand = newHand;
      deck = newDeck;
      dealerValue = getHandValue(dealerHand);
    }

    const winner = determineWinner(getHandValue(gameState.playerHand), dealerValue);
    setGameState({ ...gameState, dealerHand, deck, isPlayerTurn: false, winner });
    if (winner === "Player") {
      showToast(Toast.Style.Success, `You win! Restarting...`);
    } else {
      showToast(Toast.Style.Failure, `:( You loose! Restarting...`);
    }
  };

  const handleNewGame = () => {
    const { playerHand, dealerHand, deck } = initialDeal();
    setGameState({
      playerHand,
      dealerHand,
      deck,
      isPlayerTurn: true,
      winner: null,
    });
  };

  return (
    <List>
      <List.Section title="Your Hand">
        <List.Item
          title={gameState.playerHand.map(getCardUnicode).join(" ")}
          subtitle={`${getHandValue(gameState.playerHand).toString()} (Hit: Enter, Stand: ⌘+Enter)`}
          actions={
            !gameState.winner && (
              <ActionPanel>
                <Action title="Hit" onAction={handleHit} />
                <Action title="Stand" onAction={handleStand} />
              </ActionPanel>
            )
          }
        />
      </List.Section>
      <List.Section title="Dealer's Hand">
        <List.Item
          title={gameState.dealerHand.map(getCardUnicode).join(" ")}
          subtitle={gameState.isPlayerTurn ? "" : getHandValue(gameState.dealerHand).toString()}
        />
      </List.Section>
    </List>
  );
}
