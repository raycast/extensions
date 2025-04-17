import { ActionPanel, Action, Icon, List, showToast, Toast, Clipboard, Color } from "@raycast/api";
import { useState, useEffect } from "react";
import { vectorIndex, generateEmbedding, NoteCategory, TEMPLATES } from "./utils";

// Define types for search results based on Upstash Vector response
interface SearchResult {
  id: string;
  score: number;
  metadata?: {
    text: string;
    isUrl: boolean;
    category: NoteCategory;
    extractedData?: string;
    timestamp: string;
    urlInfo?: {
      title: string;
      url: string;
      domain: string;
      description: string;
    };
    template?: {
      id: string;
      name: string;
    };
  };
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<NoteCategory | null>(null);

  // Convert to proper extracted data object if it exists
  const parseExtractedData = (result: SearchResult) => {
    try {
      if (result.metadata?.extractedData) {
        return JSON.parse(result.metadata.extractedData) as Record<string, string[]>;
      }
    } catch (e) {
      console.error("Error parsing extracted data:", e);
    }
    return null;
  };

  async function performSearch(query: string) {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);

    try {
      // Generate embedding for the search query
      const queryEmbedding = generateEmbedding(query);

      // Search for similar notes in Upstash Vector
      const searchResults = await vectorIndex.query({
        vector: queryEmbedding,
        topK: 20, // Get more results to allow for category filtering
        includeMetadata: true,
      });

      console.log("Search results:", JSON.stringify(searchResults));

      // Use type casting to handle the response structure safely
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyResults = searchResults as any;
      if (anyResults && typeof anyResults === "object") {
        let matchedResults: SearchResult[] = [];

        if (Array.isArray(anyResults)) {
          // Handle if it's a direct array of results
          matchedResults = anyResults as SearchResult[];
        } else if (anyResults.matches && Array.isArray(anyResults.matches)) {
          // Handle 'matches' property
          matchedResults = anyResults.matches as SearchResult[];
        } else if (anyResults.results && Array.isArray(anyResults.results)) {
          // Handle 'results' property
          matchedResults = anyResults.results as SearchResult[];
        } else if (anyResults.data && Array.isArray(anyResults.data)) {
          // Handle 'data' property
          matchedResults = anyResults.data as SearchResult[];
        } else {
          // If all else fails, try to iterate over the object properties
          const possibleResults: SearchResult[] = [];
          Object.keys(anyResults).forEach((key) => {
            if (Array.isArray(anyResults[key])) {
              possibleResults.push(...anyResults[key]);
            }
          });
          matchedResults = possibleResults;
        }

        // Filter by category if selected
        if (selectedCategory) {
          matchedResults = matchedResults.filter((result) => result.metadata?.category === selectedCategory);
        }

        setResults(matchedResults);
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error("Search error:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Search failed",
        message: error instanceof Error ? error.message : String(error),
      });
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }

  // Handle search text changes with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchText);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchText, selectedCategory]);

  // Get category icon and color
  const getCategoryIcon = (category?: NoteCategory) => {
    switch (category) {
      case NoteCategory.TRAVEL:
        return { icon: Icon.Airplane, color: Color.Blue };
      case NoteCategory.PNR:
        return { icon: Icon.Ticket, color: Color.Purple };
      case NoteCategory.PASSWORD:
        return { icon: Icon.Key, color: Color.Red };
      case NoteCategory.CONTACT:
        return { icon: Icon.Person, color: Color.Green };
      case NoteCategory.CODE:
        return { icon: Icon.Code, color: Color.Yellow };
      case NoteCategory.SHOPPING:
        return { icon: Icon.Cart, color: Color.Magenta };
      case NoteCategory.ARTICLE:
        return { icon: Icon.Document, color: Color.Orange };
      default:
        return { icon: Icon.Document, color: Color.PrimaryText };
    }
  };

  // Get template icon if applicable
  const getTemplateInfo = (item: SearchResult) => {
    if (item.metadata?.template?.id) {
      const template = TEMPLATES.find((t) => t.id === item.metadata?.template?.id);
      if (template) {
        return {
          icon: template.icon,
          name: template.name,
        };
      }
    }
    return null;
  };

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search your notes..."
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Category"
          storeValue={true}
          onChange={(newValue) => {
            setSelectedCategory((newValue as NoteCategory) || null);
          }}
        >
          <List.Dropdown.Item title="All Categories" value="" />
          <List.Dropdown.Item title="Travel" value={NoteCategory.TRAVEL} icon={Icon.Airplane} />
          <List.Dropdown.Item title="PNR" value={NoteCategory.PNR} icon={Icon.Ticket} />
          <List.Dropdown.Item title="Password" value={NoteCategory.PASSWORD} icon={Icon.Key} />
          <List.Dropdown.Item title="Contact" value={NoteCategory.CONTACT} icon={Icon.Person} />
          <List.Dropdown.Item title="Code" value={NoteCategory.CODE} icon={Icon.Code} />
          <List.Dropdown.Item title="Shopping" value={NoteCategory.SHOPPING} icon={Icon.Cart} />
          <List.Dropdown.Item title="Article" value={NoteCategory.ARTICLE} icon={Icon.Document} />
          <List.Dropdown.Item title="General" value={NoteCategory.GENERAL} icon={Icon.Document} />
        </List.Dropdown>
      }
    >
      {results.length === 0 ? (
        <List.EmptyView
          icon={Icon.Document}
          title="No notes found"
          description={searchText ? "Try a different search term" : "Start typing to search your notes"}
        />
      ) : (
        results.map((item) => {
          const categoryInfo = getCategoryIcon(item.metadata?.category as NoteCategory);
          const extractedData = parseExtractedData(item);
          const hasUrlInfo = item.metadata?.urlInfo;
          const templateInfo = getTemplateInfo(item);

          // Determine what to show as title and subtitle
          let title = "";
          let subtitle = "";

          if (templateInfo) {
            // For template-based notes, show template name and first line of content
            const contentFirstLine = item.metadata?.text?.split("\n")[0] || "Untitled Note";
            title = contentFirstLine;
            subtitle = `Template: ${templateInfo.name}`;
          } else if (hasUrlInfo) {
            // For URL-based notes
            title = item.metadata?.urlInfo?.title || "Untitled URL";
            subtitle = item.metadata?.urlInfo?.domain || "";
          } else {
            // For regular text notes
            title =
              (item.metadata?.text?.substring(0, 60) || "Untitled Note") +
              (item.metadata?.text && item.metadata.text.length > 60 ? "..." : "");
            subtitle = item.metadata?.timestamp ? new Date(item.metadata.timestamp).toLocaleString() : "";
          }

          return (
            <List.Item
              key={item.id}
              icon={templateInfo ? templateInfo.icon : item.metadata?.isUrl ? Icon.Link : categoryInfo.icon}
              title={title}
              subtitle={subtitle}
              accessories={[
                {
                  text: item.metadata?.category || "GENERAL",
                  icon: categoryInfo.icon,
                },
              ]}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Category"
                        text={item.metadata?.category || "GENERAL"}
                        icon={{ source: categoryInfo.icon, tintColor: categoryInfo.color }}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Type"
                        text={templateInfo ? "Template" : item.metadata?.isUrl ? "URL" : "Text"}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Date Added"
                        text={item.metadata?.timestamp ? new Date(item.metadata.timestamp).toLocaleString() : ""}
                      />

                      {/* Show template info if available */}
                      {templateInfo && (
                        <>
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label title="Template" text={templateInfo.name} />
                        </>
                      )}

                      {/* Show URL info if available */}
                      {hasUrlInfo && (
                        <>
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label
                            title="URL Title"
                            text={item.metadata?.urlInfo?.title || ""}
                          />
                          <List.Item.Detail.Metadata.Label title="Domain" text={item.metadata?.urlInfo?.domain || ""} />
                          <List.Item.Detail.Metadata.Label
                            title="Description"
                            text={item.metadata?.urlInfo?.description || ""}
                          />
                          <List.Item.Detail.Metadata.Label title="URL" text={item.metadata?.urlInfo?.url || ""} />
                        </>
                      )}

                      <List.Item.Detail.Metadata.Separator />

                      {/* Show extracted data if available */}
                      {extractedData?.emails && extractedData.emails.length > 0 && (
                        <List.Item.Detail.Metadata.Label title="Emails" icon={Icon.Envelope} />
                      )}
                      {extractedData?.emails?.map((email, i) => (
                        <List.Item.Detail.Metadata.Label key={`email-${i}`} title={`Email ${i + 1}`} text={email} />
                      ))}

                      {extractedData?.phones && extractedData.phones.length > 0 && (
                        <List.Item.Detail.Metadata.Label title="Phone Numbers" icon={Icon.Phone} />
                      )}
                      {extractedData?.phones?.map((phone, i) => (
                        <List.Item.Detail.Metadata.Label key={`phone-${i}`} title={`Phone ${i + 1}`} text={phone} />
                      ))}

                      {extractedData?.dates && extractedData.dates.length > 0 && (
                        <List.Item.Detail.Metadata.Label title="Dates" icon={Icon.Calendar} />
                      )}
                      {extractedData?.dates?.map((date, i) => (
                        <List.Item.Detail.Metadata.Label key={`date-${i}`} title={`Date ${i + 1}`} text={date} />
                      ))}

                      {extractedData?.urls && extractedData.urls.length > 0 && (
                        <List.Item.Detail.Metadata.Label title="URLs" icon={Icon.Link} />
                      )}
                      {extractedData?.urls?.map((url, i) => (
                        <List.Item.Detail.Metadata.Label key={`url-${i}`} title={`URL ${i + 1}`} text={url} />
                      ))}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Copy to Clipboard"
                    icon={Icon.Clipboard}
                    onAction={() => {
                      Clipboard.copy(item.metadata?.text || "");
                      showToast({
                        style: Toast.Style.Success,
                        title: "Copied to clipboard",
                      });
                    }}
                  />

                  {item.metadata?.isUrl && <Action.OpenInBrowser title="Open URL" url={item.metadata?.text || ""} />}

                  {hasUrlInfo && (
                    <Action.OpenInBrowser title="Open Original URL" url={item.metadata?.urlInfo?.url || ""} />
                  )}

                  {/* Action for each extracted email */}
                  {extractedData?.emails?.map((email, i) => (
                    <Action
                      key={`email-action-${i}`}
                      title={`Email to ${email}`}
                      icon={Icon.Envelope}
                      onAction={() => {
                        Clipboard.copy(email);
                        showToast({ style: Toast.Style.Success, title: "Email copied" });
                      }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      shortcut={{ modifiers: ["cmd"], key: i < 9 ? (String(i + 1) as any) : undefined }}
                    />
                  ))}

                  {/* Actions for extracted phone numbers */}
                  {extractedData?.phones?.map((phone, i) => (
                    <Action
                      key={`phone-action-${i}`}
                      title={`Call ${phone}`}
                      icon={Icon.Phone}
                      onAction={() => {
                        Clipboard.copy(phone);
                        showToast({ style: Toast.Style.Success, title: "Phone number copied" });
                      }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      shortcut={{ modifiers: ["opt"], key: i < 9 ? (String(i + 1) as any) : undefined }}
                    />
                  ))}

                  {/* Actions for extracted URLs */}
                  {extractedData?.urls?.map((url, i) => (
                    <Action.OpenInBrowser
                      key={`url-action-${i}`}
                      title={`Open ${url.substring(0, 20)}...`}
                      url={url}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      shortcut={{ modifiers: ["shift"], key: i < 9 ? (String(i + 1) as any) : undefined }}
                    />
                  ))}
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
