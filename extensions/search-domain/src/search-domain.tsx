import { Form, ActionPanel, Action, showToast, Toast, open, List, LocalStorage } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import { API_ENDPOINT } from "./constants";

// Define a type for domain query history
interface QueryHistory {
  id: number;
  domain: string;
  isAvailable: boolean;
  date: string;
  buyLink: string | null;
}

export default function Command() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [domain, setDomain] = useState("");
  const [buyLink, setBuyLink] = useState<string | null>(null);
  const [queryHistory, setQueryHistory] = useState<QueryHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [sortReverse, setSortReverse] = useState(false); // For toggling sort order

  // Load query history from local storage when component mounts
  useEffect(() => {
    async function loadHistory() {
      const savedHistory = await LocalStorage.getItem<string>("domain-search-history");
      if (savedHistory) {
        try {
          const parsedHistory = JSON.parse(savedHistory) as QueryHistory[];
          setQueryHistory(parsedHistory);
        } catch (error) {
          // Use showFailureToast for consistent error handling
          showFailureToast({
            title: "History Error",
            message: `Failed to parse history data: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      }
    }

    loadHistory();
  }, []);

  async function handleSubmit(values: { domain: string }) {
    const domainToCheck = values.domain.includes(".") ? values.domain : `${values.domain}.com`;
    setLoading(true);
    setResult(null);
    setIsAvailable(false);
    await showToast({ style: Toast.Style.Animated, title: "Checking...", message: domainToCheck });
    try {
      const response = await fetch(`${API_ENDPOINT}?domain=${encodeURIComponent(domainToCheck)}`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.text();
      let markdown = "";
      let buyLink = "";

      if (data.includes("available")) {
        // Domain is available
        markdown = data.split("\n")[0];
        // Extract the buyLink line
        const buyLinkMatch = data.match(/buyLink:\s*(.*)/);
        if (buyLinkMatch && buyLinkMatch[1]) {
          buyLink = buyLinkMatch[1].trim();
          setBuyLink(buyLink); // Save to buyLink state
        }
        setIsAvailable(true);
        await showToast({ style: Toast.Style.Success, title: "Available", message: domainToCheck });
      } else if (data.includes("taken")) {
        // Domain is registered
        markdown = data;
        setIsAvailable(false);
        await showToast({ style: Toast.Style.Failure, title: "Registered", message: domainToCheck });
      } else if (data.includes("UnsupportedTLD")) {
        // Unsupported TLD error
        markdown = `This domain extension is not supported. Please try a common extension like .com, .net, or .org.`;
        setIsAvailable(false);
        await showToast({
          style: Toast.Style.Failure,
          title: "Unsupported Extension",
          message: "This extension is not supported",
        });
      } else if (data.includes("InvalidInput") && data.includes("Unsupported character")) {
        // Invalid character error
        markdown = `The domain name contains invalid characters. Domain names can only contain Latin letters, numbers, and hyphens (-). Special characters are not allowed.`;
        setIsAvailable(false);
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid Domain Name",
          message: "Domain contains invalid characters",
        });
      } else if (data.includes("Domain label is empty")) {
        // Empty label error
        markdown = `Domain name is empty or improperly formatted. Please enter a valid domain name.`;
        setIsAvailable(false);
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid Domain Name",
          message: "Domain name is empty or improperly formatted",
        });
      } else {
        // Other unexpected responses
        markdown = `API Error: Unexpected response. (${data})`;
        setIsAvailable(false);
        await showToast({ style: Toast.Style.Failure, title: "API Error", message: "Unexpected response format" });
      }
      // Set the domain with the buy link
      if (buyLink) {
        setDomain(domainToCheck);
      }

      // Add valid queries to history (only if available or taken, not errors)
      if (data.includes("available") || data.includes("taken")) {
        const newQuery: QueryHistory = {
          id: queryHistory.length + 1,
          domain: domainToCheck,
          isAvailable: data.includes("available"),
          date: new Date().toLocaleString(),
          buyLink: buyLink || null,
        };

        // Update state and save to local storage
        const updatedHistory = [...queryHistory, newQuery];
        setQueryHistory(updatedHistory);
        await LocalStorage.setItem("domain-search-history", JSON.stringify(updatedHistory));
      }
      setResult(markdown);
    } catch (error) {
      setResult(
        `Network Error: An error occurred during domain query: ${error instanceof Error ? error.message : String(error)}`,
      );
      setIsAvailable(false);

      // Using showFailureToast from @raycast/utils for more consistent error handling
      await showFailureToast({
        title: "Query Failed",
        message: error instanceof Error ? error.message : "Unknown network error occurred",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleBuy() {
    if (buyLink) {
      // Use the custom purchase link from the API
      open(buyLink);
    } else {
      // If there's no custom link, go to the default Namecheap link
      const domainToCheck = domain.includes(".") ? domain : `${domain}.com`;
      open(`https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(domainToCheck)}`);
    }
  }

  function handleSupport() {
    open("mailto:raycast_support@hsnsofts.com?subject=Domain Search Extension Feedback or Suggestion");
  }

  function handleBuyMeACoffee() {
    open("https://buymeacoffee.com/hsnsoft");
  }

  // Function to handle direct buy from history
  function handleHistoryBuy(historyBuyLink: string | null) {
    if (historyBuyLink) {
      open(historyBuyLink);
    } else {
      // Fallback if buyLink is null
      showToast({ style: Toast.Style.Failure, title: "No purchase link available" });
    }
  }

  // Toggle between search form and history view
  function toggleHistory() {
    setShowHistory(!showHistory);
  }

  // Toggle sort order
  function toggleSortOrder() {
    setSortReverse(!sortReverse);
  }

  if (showHistory) {
    // Sort history based on sortReverse state
    const sortedHistory = [...queryHistory].sort((a, b) => {
      if (sortReverse) {
        return b.id - a.id; // Descending order (newest first)
      } else {
        return a.id - b.id; // Ascending order (oldest first)
      }
    });

    return (
      <List
        isLoading={loading}
        searchBarAccessory={
          <List.Dropdown tooltip="Sort Order" storeValue={true} onChange={(value) => setSortReverse(value === "desc")}>
            <List.Dropdown.Item title="Oldest First" value="asc" />
            <List.Dropdown.Item title="Newest First" value="desc" />
          </List.Dropdown>
        }
        actions={
          <ActionPanel>
            <Action title="New Search" onAction={toggleHistory} shortcut={{ modifiers: ["cmd"], key: "n" }} />
            <Action title="Toggle Sort Order" onAction={toggleSortOrder} shortcut={{ modifiers: ["cmd"], key: "s" }} />
            <Action
              title="Send Feedback"
              onAction={handleSupport}
              shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
            />
            <Action
              title="Buy Me a Coffee"
              onAction={handleBuyMeACoffee}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel>
        }
      >
        <List.Section title="Query History">
          {sortedHistory.map((query) => (
            <List.Item
              key={query.id}
              title={query.domain}
              accessories={[
                { text: query.isAvailable ? "Available ✅" : "Registered ❌" },
                { date: new Date(query.date) },
                { tag: { value: `#${query.id}`, color: query.isAvailable ? "green" : "red" } },
              ]}
              actions={
                <ActionPanel>
                  {query.isAvailable && <Action title="Purchase" onAction={() => handleHistoryBuy(query.buyLink)} />}
                  <Action title="New Search" onAction={toggleHistory} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      </List>
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Search Domain"
            onSubmit={handleSubmit}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
          />
          {isAvailable && result && !loading && (
            <Action title="Purchase" onAction={handleBuy} shortcut={{ modifiers: ["cmd"], key: "p" }} />
          )}
          {queryHistory.length > 0 && (
            <Action title="Show Query History" onAction={toggleHistory} shortcut={{ modifiers: ["cmd"], key: "h" }} />
          )}
          <Action title="Send Feedback" onAction={handleSupport} shortcut={{ modifiers: ["cmd", "shift"], key: "f" }} />
          <Action
            title="Buy Me a Coffee"
            onAction={handleBuyMeACoffee}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
      enableDrafts={false}
    >
      <Form.TextField
        id="domain"
        title="Domain Name"
        placeholder="e.g. example or example.com"
        value={domain}
        onChange={setDomain}
        autoFocus
      />
      {loading && <Form.Description title="" text="              🔍 Checking...              " />}
      {result && !loading && (
        <>
          <Form.Description title="Result: " text={`                ${result}                \n`} />
          {isAvailable && <Form.Separator />}
          {isAvailable && (
            <Form.Description title="" text={`\nUse the "Purchase" option from the action menu to buy this domain.`} />
          )}
        </>
      )}

      {/* Recent Query History */}
      {queryHistory.length > 0 && (
        <>
          <Form.Separator />
          <Form.Description
            title="Recent Queries"
            text={`${queryHistory
              .slice(-5)
              .map(
                (q, index) =>
                  `${index + 1}. ${q.domain} - ${q.isAvailable ? "Available ✅" : "Registered ❌"} - ${q.date}`,
              )
              .join("\n\n")}\n\nUse "Show Query History" option for full list.`}
          />
        </>
      )}
    </Form>
  );
}
