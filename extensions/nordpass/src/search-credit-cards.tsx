/**
 * Search Credit Cards command for NordPass Raycast extension
 * Displays a searchable list of credit cards from NordPass export
 */

import { List, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { getCreditCards, refreshCache } from "./lib/storage";
import { CreditCard } from "./types";
import { exportFileExists } from "./lib/preferences";

export default function SearchCreditCards() {
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCreditCards();
  }, []);

  /**
   * Load credit cards from cache or export file
   */
  async function loadCreditCards(forceRefresh: boolean = false) {
    try {
      setIsLoading(true);
      setError(null);

      // Check if export file exists
      if (!exportFileExists()) {
        setError("Export file not found");
        setIsLoading(false);
        return;
      }

      // Get credit cards from cache
      const allCards = forceRefresh ? refreshCache().creditCards : getCreditCards();
      setCreditCards(allCards);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load credit cards";
      setError(errorMessage);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Filter credit cards based on search text
   */
  const filteredCreditCards = creditCards.filter((card) => {
    if (!searchText) return true;
    const searchLower = searchText.toLowerCase();
    return (
      card.name.toLowerCase().includes(searchLower) ||
      card.cardholderName?.toLowerCase().includes(searchLower) ||
      card.cardNumber?.toLowerCase().includes(searchLower) ||
      card.note?.toLowerCase().includes(searchLower)
    );
  });

  /**
   * Format card number for display (masked)
   */
  function formatCardNumber(cardNumber?: string): string {
    if (!cardNumber) return "";
    // Show only last 4 digits
    const cleaned = cardNumber.replace(/\s/g, "");
    if (cleaned.length <= 4) return cleaned;
    return `**** **** **** ${cleaned.slice(-4)}`;
  }

  /**
   * Copy card number to clipboard
   */
  async function copyCardNumber(card: CreditCard) {
    await showToast({
      style: Toast.Style.Success,
      title: "Copied",
      message: `Card number for ${card.name} copied to clipboard`,
    });
  }

  /**
   * Copy CVV to clipboard
   */
  async function copyCVV(card: CreditCard) {
    await showToast({
      style: Toast.Style.Success,
      title: "Copied",
      message: `CVV for ${card.name} copied to clipboard`,
    });
  }

  // Show error state
  if (error && creditCards.length === 0 && !isLoading) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Export File Not Found"
          description="Please export your NordPass data as CSV and set the export file path in Raycast preferences (⌘,)."
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search credit cards..."
      onSearchTextChange={setSearchText}
      actions={
        <ActionPanel>
          <Action title="Refresh Cache" icon={Icon.ArrowClockwise} onAction={() => loadCreditCards(true)} />
        </ActionPanel>
      }
    >
      {filteredCreditCards.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={searchText ? "No credit cards found" : "No credit cards"}
          description={searchText ? "Try a different search term" : "Export your NordPass data to get started"}
        />
      ) : (
        filteredCreditCards.map((card, index) => (
          <List.Item
            key={`${card.name}-${index}`}
            title={card.name}
            subtitle={card.cardholderName || formatCardNumber(card.cardNumber)}
            accessories={[
              { text: formatCardNumber(card.cardNumber), icon: Icon.CreditCard },
              { text: card.expiryDate || "", icon: Icon.Calendar },
              { text: card.folder || "", icon: Icon.Folder },
            ]}
            actions={
              <ActionPanel>
                {card.cardNumber && (
                  <Action.CopyToClipboard
                    title="Copy Card Number"
                    content={card.cardNumber}
                    onCopy={() => copyCardNumber(card)}
                  />
                )}
                {card.cardholderName && (
                  <Action.CopyToClipboard title="Copy Cardholder Name" content={card.cardholderName} />
                )}
                {card.expiryDate && (
                  <Action.CopyToClipboard
                    title="Copy Expiry Date"
                    content={card.expiryDate}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                  />
                )}
                {card.cvv && (
                  <Action.CopyToClipboard
                    title="Copy CVV"
                    content={card.cvv}
                    onCopy={() => copyCVV(card)}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                )}
                {card.note && (
                  <Action.CopyToClipboard
                    title="Copy Note"
                    content={card.note}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                  />
                )}
                <Action
                  title="Refresh Cache"
                  icon={Icon.ArrowClockwise}
                  onAction={() => loadCreditCards(true)}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
