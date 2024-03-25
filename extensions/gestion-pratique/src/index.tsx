import { ActionPanel, List, Action, showToast, Icon, Color } from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch"; // Import node-fetch

export default function Command() {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  useEffect(() => {
    // Trigger the search function when the query changes
    handleSearch(query);
  }, [query]); // Run this effect whenever query changes
  const handleSearch = async (query: string) => {
    if (query.trim() === "") {
      setSearchResults([]);
      return; // Stop the function execution here
    }
    
    try {
      // Perform spotlight search
      const url = `https://gestionpratique.com/spotlight_alex?spotlight=${encodeURIComponent(query)}`;
      const response = await fetch(url, {
          method: "GET",
          headers: {
              "Authorization": `Bearer efX3MxwYXwhxEHQoMo6BnVxBjp2BTcc9nwEC4psnqZGZQMJAgpCtLa2XWLHhrqcrAo9xjZwfn3LqsGnjTWX9mNVxk4J2m2ZvPUPf`,
              // Add any other required headers
          }
      });
      const data = await response.json();
      setSearchResults(data.result.map(result => ({
        ...result,
        name: result.name.replace(/<\/?b>/g, "") // Remove <b> and </b> tags
      })));
      
    } catch (error) {
      showToast("Failed to fetch search results", {
        style: "failure",
      });
    }
  };

  const handleLinkClick = (link: string) => {
    if (link) {
      // Open the link in the browser
      window.open(link);
    }
  };

  return (
    <List searchBarPlaceholder="Votre recherche..." onSearchTextChange={setQuery} isLoading={false}>
      
      {searchResults.map((result, index) => (
        <List.Item
          key={index}
          title={result.name}
          icon={{ source: Icon.Circle, tintColor: Color.Purple }}
          actions={
            <ActionPanel title="#1 in raycast/extensions">
              <Action.OpenInBrowser url={`https://gestionpratique.com${result.link}`} />
              
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
