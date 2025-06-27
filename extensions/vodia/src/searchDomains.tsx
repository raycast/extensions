// Import necessary components from Raycast API and React
import { ActionPanel, List, Action, Icon, getPreferenceValues, clearSearchBar } from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";
import { DomainCommandList, DomainListItem } from "./components/DomainCommandList";

// Define the structure of preferences
interface Preferences {
  username: string;
  password: string;
  domain: string;
}

// Define the structure of a single domain object
interface Domain {
  name: string; // The domain name (e.g., madtop.bananavoip.com)
  display: string; // The display name (e.g., Madison Top)
  alias: string[]; // Array of alternative domain names
  country: string; // Country code
  area: string; // Area code or region
}

// Define the structure of the API response
// Keys are strings (domain IDs) and values are Domain objects
interface DomainsResponse {
  [key: string]: Domain;
}

// Main component for the Raycast extension
export default function Command() {
  // Get preferences from Raycast
  const preferences = getPreferenceValues<Preferences>();

  // State management using React hooks
  const [domains, setDomains] = useState<DomainListItem[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<DomainListItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Effect hook to fetch domains when component mounts
  useEffect(() => {
    async function fetchDomains() {
      try {
        // API credentials and endpoint configuration
        const username = preferences.username;
        const password = preferences.password;
        const url = "https://" + preferences.domain + "/rest/system/domains";

        // Log the request details for debugging
        console.log("Attempting to fetch from:", url);

        // Create Basic Auth header
        const authString = Buffer.from(`${username}:${password}`).toString("base64");
        console.log("Using Authorization header:", `Basic ${authString}`);

        // Make the API request with proper headers
        const response = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Basic ${authString}`, // Basic authentication
            Accept: "application/json", // Request JSON response
            "Content-Type": "application/json", // Specify JSON content
            "Accept-Encoding": "identity", // Disable response compression
          },
        });

        // Log response details for debugging
        console.log("Response status:", response.status);
        console.log("Response headers:", response.headers);

        // Check if the response was successful
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
        }

        // Get the response body as text
        const text = await response.text();
        console.log("Response body length:", text.length);
        console.log("Response body preview:", text.substring(0, 200));

        // Validate that we received a response
        if (!text) {
          throw new Error("Empty response received from server");
        }

        try {
          // Parse the JSON response and extract display names and domain names
          const data = JSON.parse(text) as DomainsResponse;
          const domainItems = Object.values(data).map((domain) => ({
            display: domain.display,
            name: domain.name,
          }));
          setDomains(domainItems);
          setError(null);
        } catch (parseError) {
          // Handle JSON parsing errors
          throw new Error(
            `Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : "Unknown parse error"}`,
          );
        }
      } catch (error) {
        // Handle any errors that occur during the fetch process
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        console.error("Error details:", {
          error,
          message: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
        });
        setError(errorMessage);
        setDomains([]);
      } finally {
        // Always set loading to false when done
        setIsLoading(false);
      }
    }

    // Execute the fetch function
    fetchDomains();
  }, []); // Empty dependency array means this effect runs once on mount

  // If a domain is selected, show its commands
  if (selectedDomain) {
    return <DomainCommandList domain={selectedDomain} />;
  }

  // Render error state if there's an error
  if (error) {
    return (
      <List isLoading={isLoading}>
        <List.Item title={`Error: ${error}`} icon={Icon.ExclamationMark} />
      </List>
    );
  }

  // Render the list of domains
  return (
    <List isLoading={isLoading}>
      {domains.map((domain, index) => (
        <List.Item
          key={index}
          title={domain.display}
          subtitle={domain.name}
          actions={
            <ActionPanel>
              <Action
                title="Show Commands"
                onAction={async () => {
                  setSelectedDomain(domain);
                  await clearSearchBar();
                }}
              />
              <Action.OpenInBrowser
                title="Open in Browser"
                shortcut={{ modifiers: ["cmd"], key: "o" }}
                url={`https://${domain.name}`}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
