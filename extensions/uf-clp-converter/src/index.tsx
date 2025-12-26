import React, { useState, useEffect } from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import { getUFValue, getCachedUFDate } from "./utils/ufApi";
import {
  convertUFToCLP,
  convertCLPToUF,
  formatUF,
  formatCLP,
  formatUFForClipboard,
  formatCLPForClipboard,
} from "./utils/converter";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [ufValue, setUfValue] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ufDate, setUfDate] = useState<string | null>(null);

  useEffect(() => {
    loadUFValue();
  }, []);

  async function loadUFValue() {
    try {
      setIsLoading(true);
      setError(null);
      const value = await getUFValue();
      setUfValue(value);
      setUfDate(getCachedUFDate());
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load UF value";
      setError(errorMessage);
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Parse input to extract number
  function parseAmount(input: string): number | null {
    // Remove common currency symbols and whitespace
    const cleaned = input
      .replace(/[uf|clp|UF|CLP|$|,]/gi, "")
      .replace(/\s+/g, "")
      .trim();

    const number = parseFloat(cleaned);
    return isNaN(number) ? null : number;
  }

  // Detect conversion direction from input
  function detectDirection(input: string): "uf" | "clp" | "both" {
    const lower = input.toLowerCase();
    if (lower.includes("uf") && !lower.includes("clp")) return "uf";
    if (lower.includes("clp") && !lower.includes("uf")) return "clp";
    return "both";
  }

  const amount = parseAmount(searchText);
  const direction = detectDirection(searchText);
  const showBoth =
    direction === "both" ||
    (!searchText.toLowerCase().includes("uf") &&
      !searchText.toLowerCase().includes("clp"));

  let ufToClpResult: number | null = null;
  let clpToUfResult: number | null = null;

  if (amount !== null && ufValue !== null) {
    if (direction === "uf" || showBoth) {
      ufToClpResult = convertUFToCLP(amount, ufValue);
    }
    if (direction === "clp" || showBoth) {
      clpToUfResult = convertCLPToUF(amount, ufValue);
    }
  }

  function handleCopy(value: string, label: string) {
    return async () => {
      await Action.CopyToClipboard({ content: value });
      showToast({
        style: Toast.Style.Success,
        title: "Copied to clipboard",
        message: label,
      });
    };
  }

  if (error && !ufValue) {
    return (
      // @ts-expect-error - React 19 types compatibility issue with @raycast/api
      <List
        searchBarPlaceholder="Enter amount to convert..."
        onSearchTextChange={setSearchText}
      >
        {/* @ts-expect-error - React 19 types compatibility issue with @raycast/api */}
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Error loading UF value"
          description={error}
        />
      </List>
    );
  }

  return (
    // @ts-expect-error - React 19 types compatibility issue with @raycast/api
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Enter amount (e.g., 1000 or 1.5 UF)..."
      onSearchTextChange={setSearchText}
      searchText={searchText}
    >
      {ufValue && (
        // @ts-expect-error - React 19 types compatibility issue with @raycast/api
        <List.Section
          title={`Current UF Value: ${formatCLP(ufValue)} CLP${ufDate ? ` (${ufDate})` : ""}`}
        >
          {amount !== null ? (
            <>
              {(direction === "uf" || showBoth) && ufToClpResult !== null && (
                // @ts-expect-error - React 19 types compatibility issue with @raycast/api
                <List.Item
                  title={`${formatUF(amount)} UF = ${formatCLP(ufToClpResult)} CLP`}
                  subtitle={`${formatCLPForClipboard(ufToClpResult)} CLP`}
                  icon={Icon.Calculator}
                  actions={
                    // @ts-expect-error - React 19 types compatibility issue with @raycast/api
                    <ActionPanel>
                      {/* @ts-expect-error - React 19 types compatibility issue with @raycast/api */}
                      <Action
                        title="Copy to Clipboard"
                        icon={Icon.Clipboard}
                        onAction={handleCopy(
                          formatCLPForClipboard(ufToClpResult),
                          `${formatCLP(ufToClpResult)} CLP`,
                        )}
                      />
                    </ActionPanel>
                  }
                />
              )}
              {(direction === "clp" || showBoth) && clpToUfResult !== null && (
                // @ts-expect-error - React 19 types compatibility issue with @raycast/api
                <List.Item
                  title={`${formatCLP(amount)} CLP = ${formatUF(clpToUfResult)} UF`}
                  subtitle={`${formatUFForClipboard(clpToUfResult)} UF`}
                  icon={Icon.Calculator}
                  actions={
                    // @ts-expect-error - React 19 types compatibility issue with @raycast/api
                    <ActionPanel>
                      {/* @ts-expect-error - React 19 types compatibility issue with @raycast/api */}
                      <Action
                        title="Copy to Clipboard"
                        icon={Icon.Clipboard}
                        onAction={handleCopy(
                          formatUFForClipboard(clpToUfResult),
                          `${formatUF(clpToUfResult)} UF`,
                        )}
                      />
                    </ActionPanel>
                  }
                />
              )}
            </>
          ) : searchText ? (
            // @ts-expect-error - React 19 types compatibility issue with @raycast/api
            <List.Item
              title="Invalid amount"
              subtitle="Enter a valid number"
              icon={Icon.ExclamationMark}
            />
          ) : (
            // @ts-expect-error - React 19 types compatibility issue with @raycast/api
            <List.Item
              title="Enter an amount to convert"
              subtitle="Example: 1000, 1.5 UF, or 50000 CLP"
              icon={Icon.Info}
            />
          )}
        </List.Section>
      )}

      {!isLoading && ufValue && (
        // @ts-expect-error - React 19 types compatibility issue with @raycast/api
        <List.Section title="Actions">
          {/* @ts-expect-error - React 19 types compatibility issue with @raycast/api */}
          <List.Item
            title="Refresh UF Value"
            subtitle="Reload the current UF value from API"
            icon={Icon.ArrowClockwise}
            actions={
              // @ts-expect-error - React 19 types compatibility issue with @raycast/api
              <ActionPanel>
                {/* @ts-expect-error - React 19 types compatibility issue with @raycast/api */}
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={loadUFValue}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
