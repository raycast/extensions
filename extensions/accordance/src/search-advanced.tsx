import { List, ActionPanel, Action, Icon, open, useNavigation, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import { ModuleSelector } from "./components/ModuleSelector";
import { SEARCH_SCOPES } from "./utils/categories";
import { fetchModules } from "./utils/moduleUtils";
import { showFailureToast } from "@raycast/utils";

interface SearchItem {
  id: string;
  title: string;
  subtitle: string;
  detail: string;
  urlTemplate: string;
  icon: Icon;
  requiresQuery: boolean;
  formFields?: {
    query?: { label: string; placeholder: string };
    module?: boolean;
  };
}

function SearchList({ item, initialModule }: { item: SearchItem; initialModule: string }) {
  const { pop } = useNavigation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState(initialModule);
  const [selectedScope, setSelectedScope] = useState("all");

  // Helper function to construct Accordance URLs
  const constructAccordanceUrl = (
    item: SearchItem,
    query: string,
    module: string,
    scope: string,
    encodeParams = true,
  ): string => {
    let url = item.urlTemplate
      .replace("{query}", encodeParams ? encodeURIComponent(query) : query)
      .replace("{module}", encodeParams ? encodeURIComponent(module) : module);

    // For research searches, add scope if not "all"
    if (item.id.startsWith("research") && scope !== "all") {
      const scopeName = SEARCH_SCOPES.find((s) => s.id === scope)?.name || "All";
      // Insert scope in brackets before the language part
      url = url.replace("accord://research/", `accord://research/[${scopeName}];`);
    }

    return url;
  };

  const handleExecuteSearch = async () => {
    if (item.requiresQuery && !searchQuery.trim()) {
      await showFailureToast(`Please enter a search term for ${item.title}`);
      return;
    }

    const url = constructAccordanceUrl(item, searchQuery, selectedModule, selectedScope, true);

    try {
      await open(url);
      pop(); // Go back to the main list after successful search
    } catch (error) {
      console.error("Failed to open Accordance URL:", error);
      await showFailureToast("Failed to open Accordance");
    }
  };

  return (
    <List
      searchText={searchQuery}
      onSearchTextChange={setSearchQuery}
      searchBarPlaceholder={item.formFields?.query?.placeholder || "Enter search term..."}
      searchBarAccessory={
        <>
          {item.formFields?.module && (
            <ModuleSelector onModuleChange={setSelectedModule} initialModule={selectedModule} showAllModules={true} />
          )}
          {item.id.startsWith("research") && (
            <List.Dropdown tooltip="Select search scope" value={selectedScope} onChange={setSelectedScope}>
              {SEARCH_SCOPES.map((scope) => (
                <List.Dropdown.Item key={scope.id} title={scope.name} value={scope.id} icon={scope.icon} />
              ))}
            </List.Dropdown>
          )}
        </>
      }
    >
      <List.Item
        title={`Search ${item.title}`}
        subtitle={searchQuery ? `Query: "${searchQuery}"` : "Enter your search above"}
        icon={item.icon}
        accessories={[
          ...(item.formFields?.module ? [{ text: selectedModule, icon: Icon.Book }] : []),
          ...(item.id.startsWith("research")
            ? [{ text: SEARCH_SCOPES.find((s) => s.id === selectedScope)?.name || "All", icon: Icon.List }]
            : []),
          {
            text: constructAccordanceUrl(item, searchQuery, selectedModule, selectedScope, false),
            tooltip: "Generated URL",
          },
        ]}
        actions={
          <ActionPanel>
            <Action title="Execute Search" onAction={handleExecuteSearch} icon={Icon.MagnifyingGlass} />
            <Action title="Back to Search Types" onAction={() => pop()} icon={Icon.ArrowLeft} />
          </ActionPanel>
        }
      />
    </List>
  );
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [query, setQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState(preferences.defaultText); // Will be updated when modules load

  // Initialize with default module when component mounts
  useEffect(() => {
    const initializeModule = async () => {
      try {
        const { defaultModule } = await fetchModules(preferences.defaultText);
        setSelectedModule(defaultModule);
      } catch (error) {
        console.error("Failed to initialize default module:", error);
        // Keep preference default as fallback
      }
    };
    initializeModule();
  }, []);

  const searchItems: SearchItem[] = [
    {
      id: "bible-search",
      title: "Search Words in Bible",
      subtitle: `${selectedModule}`,
      detail: `Searches for words or phrases in your selected Bible text (${selectedModule}). Enter any word, phrase, or partial text to find all occurrences in the Bible. Supports complex searches with Boolean operators.`,
      urlTemplate: `accord://search/{module};Words?{query}`,
      icon: Icon.MagnifyingGlass,
      requiresQuery: true,
      formFields: {
        query: { label: "Search Term", placeholder: "Enter word or phrase to search..." },
        module: true,
      },
    },
    {
      id: "study-topic",
      title: "Search Topic in Bible",
      subtitle: "Topics",
      detail: "Try topics like 'prayer', 'faith', or 'baptism'",
      urlTemplate: `accord://study/topic?{query}`,
      icon: Icon.Book,
      requiresQuery: true,
      formFields: {
        query: { label: "Topic", placeholder: "Enter a biblical topic..." },
      },
    },
    {
      id: "study-article",
      title: "Study Topic in Tools",
      subtitle: "Search topics in your default amplify tool.",
      detail:
        "Searches for study topics and opens related articles. This is useful for finding scholarly articles, commentaries, and in-depth studies on specific biblical topics or themes.",
      urlTemplate: `accord://study/topic;Article?{query}`,
      icon: Icon.Document,
      requiresQuery: true,
      formFields: {
        query: { label: "Topic", placeholder: "Enter a biblical topic..." },
      },
    },
    {
      id: "daily-reading",
      title: "Daily Reading",
      subtitle: "Open daily reading plan",
      detail:
        "Opens Accordance's daily reading plan. This provides a structured approach to reading through the Bible, typically following a one-year or chronological reading schedule.",
      urlTemplate: "accord://read/daily",
      icon: Icon.Calendar,
      requiresQuery: false,
    },
    {
      id: "research",
      title: "Research",
      subtitle: "Research English Words",
      detail: "Searches all modules in English words in Tools",
      urlTemplate: `accord://research/{query};English`,
      icon: Icon.Text,
      requiresQuery: true,
      formFields: {
        query: { label: "English Word", placeholder: "Enter English word to research..." },
      },
    },
    {
      id: "research-greek",
      title: "Research Greek Words",
      subtitle: "Search Greek words in the Research Tab.",
      detail: "Searches for Greek words in Tools",
      urlTemplate: `accord://research/{query};Greek`,
      icon: Icon.Globe,
      requiresQuery: true,
      formFields: {
        query: { label: "Greek Word", placeholder: "Enter Greek word to research..." },
      },
    },
    {
      id: "research-hebrew",
      title: "Research Hebrew Words",
      subtitle: "Search Hebrew words in the Research Tab.",
      detail: "Searches for Hebrew words in Tools.",
      urlTemplate: `accord://research/{query};Hebrew`,
      icon: Icon.Receipt,
      requiresQuery: true,
      formFields: {
        query: { label: "Hebrew Word", placeholder: "Enter Hebrew word to research..." },
      },
    },
    {
      id: "verse-search",
      title: "Research Verses",
      subtitle: "Search all texts for verses",
      detail:
        "Searches across all Accordance text modules for verse references or citations. Useful for finding how specific verses are quoted, referenced, or interpreted in commentaries, study Bibles, and other resources.",
      urlTemplate: `accord://research/[All_Texts];Verses?{query}`,
      icon: Icon.QuoteBlock,
      requiresQuery: true,
      formFields: {
        query: { label: "Verse Reference", placeholder: "Enter verse reference (e.g., John 3:16)..." },
      },
    },
    {
      id: "timeline-search",
      title: "Timeline Search",
      subtitle: "Search biblical timeline",
      detail:
        "Searches Accordance's biblical timeline for events, periods, or figures. Enter names, dates, or events to explore the chronological context of biblical history and locate related content.",
      urlTemplate: `accord://locate/timeline?{query}`,
      icon: Icon.Clock,
      requiresQuery: true,
      formFields: {
        query: { label: "Timeline Search", placeholder: "Enter event, person, or period..." },
      },
    },
    {
      id: "atlas-search",
      title: "Atlas Search",
      subtitle: "Search biblical atlas",
      detail:
        "Searches Accordance's biblical atlas for locations, places, and geographical features. Find maps, descriptions, and related biblical content for any location mentioned in Scripture.",
      urlTemplate: `accord://locate?{query}`,
      icon: Icon.Globe,
      requiresQuery: true,
      formFields: {
        query: { label: "Location", placeholder: "Enter biblical location..." },
      },
    },
  ];

  return (
    <List
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Filter search types..."
      searchBarAccessory={
        <ModuleSelector onModuleChange={setSelectedModule} initialModule={selectedModule} showAllModules={true} />
      }
    >
      {searchItems
        .filter(
          (item) =>
            item.title.toLowerCase().includes(query.toLowerCase()) ||
            item.subtitle.toLowerCase().includes(query.toLowerCase()) ||
            item.detail.toLowerCase().includes(query.toLowerCase()),
        )
        .map((item) => (
          <List.Item
            key={item.id}
            title={item.title}
            subtitle={item.subtitle}
            accessories={[{ text: item.urlTemplate, tooltip: item.detail }]}
            icon={item.icon}
            actions={
              <ActionPanel>
                {item.requiresQuery ? (
                  <Action.Push
                    title="Configure Search"
                    target={<SearchList item={item} initialModule={selectedModule} />}
                  />
                ) : (
                  <Action
                    title="Open in Accordance"
                    onAction={async () => {
                      const url = item.urlTemplate;
                      try {
                        await open(url);
                      } catch (error) {
                        console.error("Failed to open Accordance URL:", error);
                        await showFailureToast("Failed to open Accordance");
                      }
                    }}
                  />
                )}
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
