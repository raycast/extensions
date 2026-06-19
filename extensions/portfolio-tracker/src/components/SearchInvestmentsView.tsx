/**
 * SearchInvestmentsView component.
 *
 * A reusable search view used in two contexts:
 * 1. As the content of the standalone "Search Investments" command
 * 2. As a pushed view from the portfolio when the user chooses "Add Position"
 *
 * Provides a type-ahead search experience for finding stocks, ETFs, and funds.
 * Results are fetched from Yahoo Finance via the `useAssetSearch` hook with
 * debounced input to avoid excessive API calls while the user types.
 *
 * Flow:
 * 1. User types in the search bar (e.g. "S&P 500")
 * 2. After a debounce delay, results appear as a list
 * 3. User selects a result → navigates to AssetConfirmationForm
 * 4. User enters units and confirms → position is added via `onConfirm` callback
 * 5. Navigation pops back to the portfolio view
 *
 * When used from the standalone command (search-investments.tsx), the `accountId`
 * and `accountName` may be undefined, in which case the user will need to
 * select an account first (future enhancement) or the component shows a message.
 *
 * Features:
 * - Debounced type-ahead search (350ms default)
 * - Asset type icons and coloured tags (Stock, ETF, Mutual Fund, etc.)
 * - Exchange information displayed as accessory
 * - Loading indicator while fetching
 * - Error display for offline / API errors
 * - Empty state prompts when no query or no results
 * - Keyboard-friendly: immediate focus on the search bar
 *
 * Usage (pushed from portfolio):
 * ```tsx
 * push(
 *   <SearchInvestmentsView
 *     accountId="abc-123"
 *     accountName="Vanguard ISA"
 *     onConfirm={async (params) => { await addPosition(accountId, params); }}
 *   />
 * );
 * ```
 *
 * Usage (standalone command):
 * ```tsx
 * export default function Command() {
 *   return <SearchInvestmentsView />;
 * }
 * ```
 */

import React from "react";
import { useState } from "react";
import { Icon, List, useNavigation } from "@raycast/api";
import { useAssetSearch } from "../hooks/useAssetSearch";
import { SearchResultItem } from "./SearchResultItem";
import { AssetConfirmationForm } from "./AssetConfirmation";
import { AssetSearchResult, AssetType, ErrorType } from "../utils/types";

// ──────────────────────────────────────────
// Props
// ──────────────────────────────────────────

export interface SearchInvestmentsViewProps {
  /**
   * The ID of the account to add positions to.
   * When undefined, the view operates in "browse-only" mode
   * (useful for the standalone search command without a target account).
   */
  accountId?: string;

  /**
   * The name of the target account (for display in the confirmation view).
   * Required when `accountId` is provided.
   */
  accountName?: string;

  /**
   * Callback fired when the user confirms adding a position.
   * Receives all data needed to create a new Position.
   * Only available when `accountId` is provided.
   */
  onConfirm?: (params: {
    symbol: string;
    name: string;
    units: number;
    currency: string;
    assetType: AssetType;
  }) => Promise<void>;

  /**
   * Optional override for result selection.
   * When provided, the view delegates selection to the parent flow
   * instead of pushing the AssetConfirmationForm.
   */
  onSelectResult?: (result: AssetSearchResult) => void;
}

// ──────────────────────────────────────────
// Component
// ──────────────────────────────────────────

/**
 * Investment search view with type-ahead results from Yahoo Finance.
 *
 * Renders a Raycast List with:
 * - A search bar for typing queries
 * - Search results as list items (via SearchResultItem)
 * - Empty states for no query, no results, and errors
 * - Navigation to the AssetConfirmationForm on selection
 */
export function SearchInvestmentsView({
  accountId,
  accountName,
  onConfirm,
  onSelectResult,
}: SearchInvestmentsViewProps): React.JSX.Element {
  const { push } = useNavigation();
  const [searchText, setSearchText] = useState("");

  // ── Search Hook ──

  const { results, isLoading, error, searchedQuery } = useAssetSearch(searchText);

  // ── Derived State ──

  const hasQuery = searchText.trim().length > 0;
  const hasResults = results.length > 0;
  const hasError = !!error;
  const canAddPositions = !!accountId && !!onConfirm;

  // ── Handlers ──

  /**
   * Called when the user selects a search result.
   * Navigates to the AssetConfirmationForm if an account context is available.
   */
  function handleSelectResult(result: AssetSearchResult): void {
    if (onSelectResult) {
      onSelectResult(result);
      return;
    }

    if (!canAddPositions) {
      // In browse-only mode, we could show asset details in the future.
      // For now, we just do nothing if there's no account context.
      return;
    }

    push(
      <AssetConfirmationForm
        result={result}
        accountId={accountId!}
        accountName={accountName ?? "Account"}
        onConfirm={onConfirm!}
      />,
    );
  }

  // ── Search Bar Placeholder ──

  const placeholder = canAddPositions
    ? `Search investments to add to ${accountName ?? "account"}...`
    : "Search stocks, ETFs, and funds...";

  // ── Render ──

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={placeholder}
      navigationTitle={canAddPositions ? `Add Position to ${accountName}` : "Search Investments"}
      filtering={false}
    >
      {/* ── No Query State ── */}
      {!hasQuery && !isLoading && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search for Investments"
          description={
            'Type a name, ticker, or ISIN to find stocks, ETFs, and funds.\n\nExamples: "S&P 500", "AAPL", "Vanguard"'
          }
        />
      )}

      {/* ── No Results State ── */}
      {hasQuery && !isLoading && !hasResults && !hasError && (
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="No Results Found"
          description={`No investments matched "${searchedQuery}". Try a different search term, ticker symbol, or ISIN code.`}
        />
      )}

      {/* ── Error State ── */}
      {hasError && !hasResults && (
        <List.EmptyView
          icon={error.type === ErrorType.OFFLINE ? Icon.WifiDisabled : Icon.ExclamationMark}
          title={error.type === ErrorType.OFFLINE ? "You Appear to Be Offline" : "Search Failed"}
          description={
            error.type === ErrorType.OFFLINE ? "Check your internet connection and try again." : error.message
          }
        />
      )}

      {/* ── Search Results ── */}
      {hasResults && (
        <List.Section
          title="Search Results"
          subtitle={`${results.length} result${results.length === 1 ? "" : "s"}${searchedQuery ? ` for "${searchedQuery}"` : ""}`}
        >
          {results.map((result) => (
            <SearchResultItem key={result.symbol} result={result} onSelect={handleSelectResult} />
          ))}
        </List.Section>
      )}

      {/* ── Error banner shown alongside stale results ── */}
      {hasError && hasResults && (
        <List.Section title="⚠️ Search Error">
          <List.Item
            icon={error.type === ErrorType.OFFLINE ? Icon.WifiDisabled : Icon.ExclamationMark}
            title={
              error.type === ErrorType.OFFLINE ? "Offline — showing previous results" : "Error fetching latest results"
            }
            subtitle={error.message}
          />
        </List.Section>
      )}
    </List>
  );
}
