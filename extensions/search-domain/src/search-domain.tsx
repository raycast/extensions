import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  open,
  List,
  LocalStorage,
  Keyboard,
  Clipboard,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import { RDAP_GENERIC } from "./constants";
import { Root, Entity } from "./types";
import HistoryCommand from "./history";

// Define a type for domain query history
interface QueryHistory {
  id: number;
  domain: string;
  isAvailable: boolean;
  date: string;
  buyLink: string | null;
}

// Component to display detailed domain information in table view
function DomainDetailView({
  data,
  domain,
  onBack,
  onBuy,
}: {
  data: Root;
  domain: string;
  onBack: () => void;
  onBuy: () => void;
}) {
  // Extract owner information from entities
  const registrant = data.entities?.find((entity) => entity.roles?.includes("registrant"));
  const registrar = data.entities?.find((entity) => entity.roles?.includes("registrar"));

  // Extract dates from events
  const createdEvent = data.events?.find(
    (event) => event.eventAction === "registration" || event.eventAction === "created",
  );
  const expiresEvent = data.events?.find(
    (event) => event.eventAction === "expiration" || event.eventAction === "expired",
  );

  const createdDate = createdEvent ? new Date(createdEvent.eventDate).toLocaleDateString() : "Unknown";
  const expiresDate = expiresEvent ? new Date(expiresEvent.eventDate).toLocaleDateString() : "Unknown";

  // Extract contact info from vcardArray
  const getContactInfo = (entity: Entity) => {
    if (!entity?.vcardArray?.[1]) return null;

    const properties = entity.vcardArray[1];
    const email = properties.find((prop: [string, unknown, string, string]) => prop[0] === "email")?.[3];
    const name = properties.find((prop: [string, unknown, string, string]) => prop[0] === "fn")?.[3];
    const org = properties.find((prop: [string, unknown, string, string]) => prop[0] === "org")?.[3];

    return { email, name, org };
  };

  const registrantInfo = registrant ? getContactInfo(registrant) : null;
  const registrarInfo = registrar ? getContactInfo(registrar) : null;

  // Create table items
  const tableItems = [
    { title: "Domain", subtitle: domain },
    { title: "Status", subtitle: data.status?.join(", ") || "Unknown" },
    { title: "Created", subtitle: createdDate },
    { title: "Expires", subtitle: expiresDate },
    { title: "Handle", subtitle: data.handle || "Unknown" },
  ];

  if (registrarInfo?.org) {
    tableItems.push({ title: "Registrar", subtitle: registrarInfo.org });
  }

  if (registrantInfo?.name) {
    tableItems.push({ title: "Registrant Name", subtitle: registrantInfo.name });
  }

  if (registrantInfo?.org) {
    tableItems.push({ title: "Registrant Organization", subtitle: registrantInfo.org });
  }

  if (registrantInfo?.email) {
    tableItems.push({ title: "Contact Email", subtitle: registrantInfo.email });
  }

  if (data.nameservers && data.nameservers.length > 0) {
    const nsList = data.nameservers.map((ns) => ns.ldhName).join(", ");
    tableItems.push({ title: "Nameservers", subtitle: nsList });
  }

  return (
    <List
      actions={
        <ActionPanel>
          <Action title="Back to Search" onAction={onBack} />
          <Action title="Purchase Similar Domain" onAction={onBuy} shortcut={{ modifiers: ["cmd"], key: "b" }} />
          <Action
            title="Open Domain"
            onAction={() => open(`https://${domain}`)}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
        </ActionPanel>
      }
    >
      <List.Section title={`${domain} - Domain Information`}>
        {tableItems.map((item, index) => (
          <List.Item
            key={index}
            title={item.title}
            subtitle={item.subtitle}
            actions={
              <ActionPanel>
                {item.title === "Contact Email" && item.subtitle && (
                  <Action
                    title="Send Email"
                    onAction={() => open(`mailto:${item.subtitle}`)}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                  />
                )}
                <Action
                  title="Copy Value"
                  onAction={() => Clipboard.copy(item.subtitle || "")}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

export default function Command() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [domainData, setDomainData] = useState<Root | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [domain, setDomain] = useState("");
  const [buyLink, setBuyLink] = useState<string | null>(null);
  const [queryHistory, setQueryHistory] = useState<QueryHistory[]>([]);
  const [showDetail, setShowDetail] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

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
    setDomainData(null);
    setIsAvailable(false);
    await showToast({ style: Toast.Style.Animated, title: "Checking...", message: domainToCheck });
    try {
      // Use the generic RDAP resolver for all TLDs (rdap.org redirects to the authoritative registry)
      const response = await fetch(`${RDAP_GENERIC}/${encodeURIComponent(domainToCheck)}`);

      let markdown = "";
      let buyLink = "";

      if (response.status === 404) {
        // Domain is not registered (available)
        markdown = `Domain ${domainToCheck} is available for purchase!`;
        buyLink = `https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(domainToCheck)}`;
        setBuyLink(buyLink);
        setIsAvailable(true);
        await showToast({ style: Toast.Style.Success, title: "Available", message: domainToCheck });
      } else if (response.ok) {
        // Domain is registered, parse RDAP response
        let responseData;
        try {
          responseData = await response.json();
        } catch (parseError) {
          throw new Error(
            `Failed to parse response: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
          );
        }
        const data: Root = responseData as Root;
        setDomainData(data);
        markdown = `Domain ${domainToCheck} is registered`;
        setIsAvailable(false);
        await showToast({ style: Toast.Style.Failure, title: "Registered", message: domainToCheck });
      } else {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      // Set domain with the buy link
      if (buyLink) {
        setDomain(domainToCheck);
      }

      // Add valid queries to history (only if available or registered)
      const isDomainAvailable = response.status === 404;
      if (response.status === 404 || response.ok) {
        const newQuery: QueryHistory = {
          id: queryHistory.length + 1,
          domain: domainToCheck,
          isAvailable: isDomainAvailable,
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
      // Use the purchase link
      open(buyLink);
    } else {
      // Generate default Namecheap link
      const domainToCheck = domain.includes(".") ? domain : `${domain}.pw`;
      open(`https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(domainToCheck)}`);
    }
  }

  function handleSupport() {
    open("mailto:raycast_support@hsnsofts.com?subject=Domain Search Extension Feedback or Suggestion");
  }

  function handleBuyMeACoffee() {
    open("https://buymeacoffee.com/hsnsoft");
  }

  // Show detailed view for registered domains
  function showDetailedView() {
    if (domainData) {
      setShowDetail(true);
    }
  }

  // Show history view
  function showHistoryView() {
    setShowHistory(true);
  }

  // Back to search from detail view
  function backToSearch() {
    setShowDetail(false);
  }

  // Show detail view if we have domain data
  if (showDetail && domainData) {
    return <DomainDetailView data={domainData} domain={domain} onBack={backToSearch} onBuy={handleBuy} />;
  }

  // Show history view when requested
  if (showHistory) {
    return <HistoryCommand onBack={() => setShowHistory(false)} />;
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
            <Action title="Purchase" onAction={handleBuy} shortcut={{ modifiers: ["cmd"], key: "b" }} />
          )}
          {!isAvailable && domainData && !loading && (
            <Action title="View Details" onAction={showDetailedView} shortcut={{ modifiers: ["cmd"], key: "d" }} />
          )}
          <Action title="View History" onAction={showHistoryView} shortcut={{ modifiers: ["cmd"], key: "h" }} />
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
        placeholder="e.g. example.com"
        value={domain}
        onChange={setDomain}
        autoFocus
      />
      {loading && <Form.Description title="" text="              Checking...              " />}
      {result && !loading && (
        <>
          <Form.Separator />
          <Form.Description title="Result: " text={result} />
          {isAvailable && (
            <Form.Description title="" text={`\nUse "Purchase" option from the action menu to buy this domain.`} />
          )}
          {!isAvailable && domainData && (
            <Form.Description
              title=""
              text={`\nUse "View Details" option to see ownership information in table view.`}
            />
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
              .slice(-3)
              .reverse()
              .map(
                (q, index) => `${index + 1}. ${q.domain} - ${q.isAvailable ? "Available" : "Registered"} - ${q.date}`,
              )
              .join("\n\n")}\n\nUse "View History" option for full list.`}
          />
        </>
      )}
    </Form>
  );
}
