import { Action, ActionPanel, List, showToast, Toast, Detail, Icon, getPreferenceValues, Color } from "@raycast/api";
import { useState, useEffect } from "react";
import { getHeptabaseMCPClient } from "./heptabase-mcp-client";
import { authorize } from "./heptabase-oauth";
import { buildHeptabaseUrl, getObjectIcon } from "./shared-types";
import { ObjectDetail } from "./search-heptabase";
import { parseHeptabaseList } from "./xml-parser";

/**
 * Whiteboard from search results
 */
interface Whiteboard {
  id: string;
  name?: string;
  title?: string;
  description?: string;
}

/**
 * MCP result for whiteboard search
 */
interface SearchWhiteboardsResult {
  content?: Array<{
    type: string;
    text: string;
  }>;
}

/**
 * Parsed whiteboard object from XML
 */
interface ParsedWhiteboardObject {
  id: string;
  type: string;
  title: string;
  content: string;
  parentSection?: string;
}

/**
 * MCP result for whiteboard with objects
 */
interface WhiteboardWithObjectsResult {
  content?: Array<{
    type: string;
    text: string;
  }>;
}

/**
 * Parse whiteboard XML response into structured objects
 */

/**
 * Detail view for whiteboard with all objects - Hierarchical Navigator
 */
function WhiteboardDetail({ whiteboardId, whiteboardName }: { whiteboardId: string; whiteboardName: string }) {
  const [objects, setObjects] = useState<ParsedWhiteboardObject[]>([]);
  const [rawContent, setRawContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [whiteboardTitle, setWhiteboardTitle] = useState(whiteboardName);

  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    async function loadWhiteboard() {
      try {
        await authorize();
        const client = getHeptabaseMCPClient();
        const result = (await client.callTool("get_whiteboard_with_objects", {
          whiteboardId,
        })) as WhiteboardWithObjectsResult;

        if (result.content && Array.isArray(result.content)) {
          const textContent = result.content.find((c) => c.type === "text");
          if (textContent) {
            setRawContent(textContent.text);

            // Extract main whiteboard title
            const wbTitleMatch = textContent.text.match(/<whiteboard[^>]*name="([^"]+)"/);
            const title = wbTitleMatch ? wbTitleMatch[1] : whiteboardName;

            // Define allowed tags to parse (inside the whiteboard wrapper)
            const whiteboardObjectTypes = [
              "card",
              "section",
              "textElement",
              "mindmap",
              "imageCard",
              "videoCard",
              "audioCard",
              "pdfCard",
              "highlightElement",
              "mediaCard",
            ];

            const parsed = parseHeptabaseList(textContent.text, whiteboardObjectTypes);
            // Map parsed objects to the structure WhiteboardDetail expects
            const mappedObjects: ParsedWhiteboardObject[] = parsed.map((p) => ({
              id: p.id,
              type: p.type,
              title: p.title || "", // xml-parser now handles extraction
              content: p.content,
              parentSection: p.attributes.parentType === "section" ? p.attributes.parentId : undefined,
            }));

            setWhiteboardTitle(title);
            setObjects(mappedObjects);
          }
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error("Error loading whiteboard:", errorMessage);
        await showToast({ style: Toast.Style.Failure, title: "Error", message: errorMessage });
      } finally {
        setIsLoading(false);
      }
    }
    loadWhiteboard();
  }, [whiteboardId]);

  // Group objects by type for hierarchical display
  const sections = objects.filter((o) => o.type === "section");
  const cards = objects.filter((o) => o.type === "card");
  const textElements = objects.filter((o) => o.type === "textElement");
  const mindmaps = objects.filter((o) => o.type === "mindmap");
  const mediaCards = objects.filter((o) => ["imageCard", "videoCard", "audioCard", "pdfCard"].includes(o.type));
  const highlights = objects.filter((o) => o.type === "highlightElement");

  const heptabaseUrl = buildHeptabaseUrl(preferences.spaceId, "whiteboard", whiteboardId);

  // If we parsed objects, show hierarchical list
  if (objects.length > 0) {
    return (
      <List isLoading={isLoading} navigationTitle={whiteboardTitle}>
        {/* Sections */}
        {sections.length > 0 && (
          <List.Section title="Sections" subtitle={`${sections.length}`}>
            {sections.map((obj) => (
              <List.Item
                key={obj.id}
                icon={{ source: Icon.Folder, tintColor: Color.Blue }}
                title={obj.title || "Untitled Section"}
                subtitle={obj.content.substring(0, 60)}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy Title" content={obj.title} />
                    <Action.CopyToClipboard title="Copy ID" content={obj.id} />
                    {heptabaseUrl && (
                      <Action.OpenInBrowser title="Open Whiteboard" icon={Icon.Globe} url={heptabaseUrl} />
                    )}
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        )}

        {/* Cards */}
        {cards.length > 0 && (
          <List.Section title="Cards" subtitle={`${cards.length}`}>
            {cards.map((obj) => (
              <List.Item
                key={obj.id}
                icon={{ source: Icon.Document, tintColor: Color.Green }}
                title={obj.title || obj.content.substring(0, 50) || ""}
                subtitle={obj.title ? obj.content.substring(0, 60) : ""}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="View Card"
                      icon={Icon.Eye}
                      target={<ObjectDetail objectId={obj.id} objectType="card" initialTitle={obj.title} />}
                    />
                    {buildHeptabaseUrl(preferences.spaceId, "card", obj.id) && (
                      <Action.OpenInBrowser
                        title="Open in Heptabase"
                        icon={Icon.Globe}
                        url={buildHeptabaseUrl(preferences.spaceId, "card", obj.id)!}
                        shortcut={{ modifiers: ["cmd"], key: "o" }}
                      />
                    )}
                    <Action.CopyToClipboard title="Copy Title" content={obj.title} />
                    <Action.CopyToClipboard title="Copy Content Preview" content={obj.content} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        )}

        {/* Text Elements */}
        {textElements.length > 0 && (
          <List.Section title="Text Elements" subtitle={`${textElements.length}`}>
            {textElements.map((obj) => (
              <List.Item
                key={obj.id}
                icon={{ source: Icon.Text, tintColor: Color.Orange }}
                title={obj.title || obj.content.substring(0, 50) || "Text"}
                subtitle={obj.content.substring(0, 80)}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy Content" content={obj.content} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        )}

        {/* Mindmaps */}
        {mindmaps.length > 0 && (
          <List.Section title="Mindmaps" subtitle={`${mindmaps.length}`}>
            {mindmaps.map((obj) => (
              <List.Item
                key={obj.id}
                icon={{ source: Icon.List, tintColor: Color.Purple }}
                title={obj.title || "Mindmap"}
                subtitle={obj.content.substring(0, 60)}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy Content" content={obj.content} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        )}

        {/* Media Cards */}
        {mediaCards.length > 0 && (
          <List.Section title="Media" subtitle={`${mediaCards.length}`}>
            {mediaCards.map((obj) => (
              <List.Item
                key={obj.id}
                icon={getObjectIcon(obj.type)}
                title={obj.title || obj.type}
                accessories={[{ text: obj.type.replace("Card", "") }]}
                actions={
                  <ActionPanel>
                    {["imageCard", "videoCard", "audioCard", "pdfCard"].includes(obj.type) && (
                      <Action.Push
                        title="View Media"
                        icon={Icon.Eye}
                        target={
                          <ObjectDetail objectId={obj.id} objectType={obj.type} initialTitle={obj.title || obj.type} />
                        }
                      />
                    )}
                    {buildHeptabaseUrl(preferences.spaceId, obj.type, obj.id) && (
                      <Action.OpenInBrowser
                        title="Open in Heptabase"
                        icon={Icon.Globe}
                        url={buildHeptabaseUrl(preferences.spaceId, obj.type, obj.id)!}
                        shortcut={{ modifiers: ["cmd"], key: "o" }}
                      />
                    )}
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        )}

        {/* Highlights */}
        {highlights.length > 0 && (
          <List.Section title="Highlights" subtitle={`${highlights.length}`}>
            {highlights.map((obj) => (
              <List.Item
                key={obj.id}
                icon={{ source: Icon.Highlight, tintColor: Color.Yellow }}
                title={obj.content.substring(0, 80) || "Highlight"}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy Highlight" content={obj.content} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        )}
      </List>
    );
  }

  // Fallback: show raw content as markdown
  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={whiteboardTitle}
      markdown={
        rawContent
          ? `# ${whiteboardTitle}\n\n*No structured objects found. Showing raw response:*\n\n\`\`\`\n${rawContent.substring(0, 2000)}...\n\`\`\``
          : "Loading whiteboard..."
      }
      actions={
        <ActionPanel>
          {heptabaseUrl && (
            <Action.OpenInBrowser
              title="Open in Heptabase"
              icon={Icon.Globe}
              url={heptabaseUrl}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          )}
          <Action.CopyToClipboard title="Copy Raw Content" content={rawContent} />
        </ActionPanel>
      }
    />
  );
}

/**
 * Search Whiteboards
 * Find whiteboards by keywords
 */
export default function SearchWhiteboards() {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<Whiteboard[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function search() {
      if (!searchText.trim()) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        await authorize();
        const client = getHeptabaseMCPClient();

        // Split by comma for multiple keywords, max 5
        const keywords = searchText
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean)
          .slice(0, 5);

        const result = (await client.callTool("search_whiteboards", {
          keywords,
        })) as SearchWhiteboardsResult;

        // Parse results
        if (result.content && Array.isArray(result.content)) {
          const textContent = result.content.find((c) => c.type === "text");
          if (textContent) {
            const rawText = textContent.text;

            try {
              const parsed = JSON.parse(rawText);
              if (Array.isArray(parsed)) {
                setResults(parsed);
              } else if (parsed.whiteboards && Array.isArray(parsed.whiteboards)) {
                setResults(parsed.whiteboards);
              } else {
                setResults([]);
              }
            } catch {
              // Not JSON, try XML parsing
              // Format: <whiteboard id="..." name="..." description="..." />
              const whiteboards: Whiteboard[] = [];
              const wbRegex =
                /<whiteboard\s+id="([^"]+)"\s+(?:name|title)="([^"]*)"(?:[^>]*description="([^"]*)")?[^>]*>/g;

              let match;
              while ((match = wbRegex.exec(rawText)) !== null) {
                whiteboards.push({
                  id: match[1],
                  name: match[2],
                  title: match[2],
                  description: match[3] || "",
                });
              }

              if (whiteboards.length > 0) {
                setResults(whiteboards);
              } else {
                setResults([]);
              }
            }
          }
        } else {
          setResults([]);
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error("Error searching whiteboards:", e);

        await showToast({
          style: Toast.Style.Failure,
          title: "Search failed",
          message: errorMessage,
        });
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }

    // Set loading immediately when typing, then debounce the actual search
    if (searchText.trim()) {
      setIsLoading(true);
    }
    const timer = setTimeout(search, 500);
    return () => clearTimeout(timer);
  }, [searchText]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search whiteboards (separate keywords with comma, max 5)..."
      throttle
    >
      {results.length === 0 && searchText ? (
        <List.EmptyView
          title={isLoading ? "Searching..." : "No whiteboards found"}
          description={isLoading ? `Searching for: ${searchText}` : `No matches for: ${searchText}`}
          icon={isLoading ? { source: "⏳" } : Icon.AppWindowGrid2x2}
        />
      ) : (
        results.map((wb, index) => (
          <List.Item
            key={wb.id || `wb-${index}`}
            icon={Icon.AppWindowGrid2x2}
            title={wb.name || wb.title || "Untitled Whiteboard"}
            subtitle={wb.description}
            accessories={[{ text: "Whiteboard" }]}
            actions={
              <ActionPanel>
                {(() => {
                  const preferences = getPreferenceValues<Preferences>();
                  const heptabaseUrl = buildHeptabaseUrl(preferences.spaceId, "whiteboard", wb.id);
                  if (heptabaseUrl) {
                    return (
                      <Action.OpenInBrowser
                        title="Open in Heptabase"
                        icon={Icon.Globe}
                        url={heptabaseUrl}
                        shortcut={{ modifiers: ["cmd"], key: "o" }}
                      />
                    );
                  }
                  return null;
                })()}
                <Action.Push
                  title="View Whiteboard Objects"
                  icon={Icon.Eye}
                  target={
                    <WhiteboardDetail whiteboardId={wb.id} whiteboardName={wb.name || wb.title || "Whiteboard"} />
                  }
                />
                <Action.CopyToClipboard
                  title="Copy Name"
                  content={wb.name || wb.title || ""}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.CopyToClipboard
                  title="Copy ID"
                  content={wb.id}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
