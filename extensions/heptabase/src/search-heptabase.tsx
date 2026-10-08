import { Action, ActionPanel, List, showToast, Toast, Detail, Icon, getPreferenceValues } from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { getHeptabaseMCPClient } from "./heptabase-mcp-client";
import { authorize } from "./heptabase-oauth";
import { getObjectIcon, buildHeptabaseUrl } from "./shared-types";
import { parseHeptabaseObject, parseHeptabaseList } from "./xml-parser";

/**
 * Object types from Heptabase MCP
 */
type ObjectType = "card" | "pdfCard" | "mediaCard" | "highlightElement" | "journal" | "whiteboard";

/**
 * Search result object
 */
interface SearchResultObject {
  id: string;
  type: ObjectType;
  title?: string;
  content?: string;
  preview?: string;
  hasMore?: boolean;
  whiteboardIds?: string[];
}

/**
 * MCP tool result for semantic search
 */
interface SemanticSearchResult {
  content?: Array<{
    type: string;
    text: string;
  }>;
}

/**
 * Full object content result
 */
interface GetObjectResult {
  content?: Array<{
    type: string;
    text: string;
  }>;
}

/**
 * Map search result type to get_object objectType
 * Returns null if the type is not supported by get_object
 */
function mapToObjectType(searchType: string): string | null {
  const typeMap: Record<string, string> = {
    card: "card",
    journal: "journal",
    videoCard: "videoCard",
    audioCard: "audioCard",
    imageCard: "imageCard",
    highlightElement: "highlightElement",
    textElement: "textElement",
    section: "section",
    // mediaCard could be video, audio, or image - default to card for now
    mediaCard: "card",
  };

  // pdfCard is explicitly NOT supported by get_object
  if (searchType === "pdfCard") {
    return null;
  }

  return typeMap[searchType] || "card";
}

/**
 * Detail view for full object content
 */
/**
 * Detail view for full object content
 */
export function ObjectDetail({
  objectId,
  objectType,
  initialTitle,
  initialContent,
}: {
  objectId: string;
  objectType: string;
  initialTitle?: string;
  initialContent?: string;
}) {
  const [content, setContent] = useState<string>(initialContent || "");
  const [isLoading, setIsLoading] = useState(true);
  const [objectTitle, setObjectTitle] = useState<string>(initialTitle || "");

  useEffect(() => {
    async function loadObject() {
      // If we have an initial title but no title state set yet, ensure it's set
      if (initialTitle && !objectTitle) {
        setObjectTitle(initialTitle);
      }

      // Check for raw result marker - don't call get_object
      if (objectId === "__raw__") {
        setContent("This is a raw search result. The content is shown in the search result list.");
        setIsLoading(false);
        return;
      }

      // Check if type is supported
      const mappedType = mapToObjectType(objectType);

      if (!mappedType) {
        setContent(`Cannot view full content for ${objectType} objects. Use the PDF viewer instead.`);
        setIsLoading(false);
        return;
      }

      try {
        await authorize();

        const client = getHeptabaseMCPClient();
        const result = (await client.callTool("get_object", {
          objectId,
          objectType: mappedType,
        })) as GetObjectResult;

        if (result.content && Array.isArray(result.content)) {
          const rawText = result.content
            .filter((c) => c.type === "text")
            .map((c) => c.text)
            .join("\n\n");

          // Find the actual content section
          const contentStartMatch = rawText.match(
            /<(card|journal|highlightElement|videoCard|audioCard|imageCard|textElement|section)\s+id=/,
          );
          const contentStart = contentStartMatch ? contentStartMatch.index! : 0;
          const xmlContent = rawText.substring(contentStart);

          const parsedObject = parseHeptabaseObject(xmlContent);

          if (parsedObject) {
            // Update title if needed
            if (parsedObject.title) {
              setObjectTitle(parsedObject.title);
            }
            setContent(parsedObject.content);
          } else {
            // Fallback if parsing failed
            setContent(xmlContent);
          }
        } else {
          setContent(JSON.stringify(result, null, 2));
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error("Error loading object:", errorMessage);
        setContent(`Error loading object: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    }
    loadObject();
  }, [objectId, objectType]);

  const preferences = getPreferenceValues<Preferences>();
  const spaceId = preferences.spaceId;

  return (
    <Detail
      isLoading={isLoading}
      markdown={content}
      navigationTitle={objectTitle}
      actions={
        <ActionPanel>
          {(() => {
            const heptabaseUrl = buildHeptabaseUrl(spaceId, objectType, objectId);
            if (heptabaseUrl) {
              return <Action.OpenInBrowser title="Open in Heptabase" icon={Icon.Globe} url={heptabaseUrl} />;
            }
            return null;
          })()}
          {objectTitle && (
            <Action.Push
              title="Find Similar Notes"
              icon={Icon.MagnifyingGlass}
              target={<SearchHeptabase initialSearchText={objectTitle} />}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
            />
          )}
          <Action.CopyToClipboard title="Copy Content" content={content} />
        </ActionPanel>
      }
    />
  );
}

/**
 * Whiteboard detail view
 */
function WhiteboardDetail({ whiteboardId }: { whiteboardId: string }) {
  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadWhiteboard() {
      try {
        await authorize();
        const client = getHeptabaseMCPClient();
        const result = await client.callTool("get_whiteboard_with_objects", {
          whiteboardId,
        });

        setContent(JSON.stringify(result, null, 2));
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        setContent(`Error loading whiteboard: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    }
    loadWhiteboard();
  }, [whiteboardId]);

  return (
    <Detail
      isLoading={isLoading}
      markdown={`\`\`\`json\n${content}\n\`\`\``}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Content" content={content} />
        </ActionPanel>
      }
    />
  );
}

/**
 * PDF result from API
 */
interface PDFPagesResult {
  content?: Array<{
    type: string;
    text: string;
  }>;
}

/**
 * PDF Search/View component with pagination
 */
function PDFDetail({ pdfCardId }: { pdfCardId: string }) {
  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [currentStart, setCurrentStart] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [needsParsing, setNeedsParsing] = useState(false);
  const pageSize = 10;

  const preferences = getPreferenceValues<Preferences>();
  const heptabaseUrl = buildHeptabaseUrl(preferences.spaceId, "pdfCard", pdfCardId);

  async function loadPages(start: number) {
    setIsLoading(true);
    setError(null);
    try {
      await authorize();
      const client = getHeptabaseMCPClient();
      const result = (await client.callTool("get_pdf_pages", {
        pdfCardId,
        startPageNumber: start,
        endPageNumber: start + pageSize - 1,
      })) as PDFPagesResult;

      // Parse the result
      if (result.content && Array.isArray(result.content)) {
        const textContent = result.content.find((c) => c.type === "text");
        if (textContent) {
          const xmlText = textContent.text;

          // Check if PDF needs parsing
          if (xmlText.includes("not parsed yet") || xmlText.includes("parsePdfForAiAgent")) {
            setNeedsParsing(true);
            // Extract title if available
            const titleMatch = xmlText.match(/title="([^"]+)"/);
            const title = titleMatch ? titleMatch[1] : "This PDF";
            setContent(
              `## ${title}\n\n` +
                `⚠️ **This PDF has not been parsed yet.**\n\n` +
                `To view PDF content, you need to first open and view it in Heptabase.\n\n` +
                `Press **Enter** to open the PDF in Heptabase, then come back and use **⌘R** to reload.`,
            );
            return;
          }

          // PDF format uses <chunk page="1">content</chunk> format
          // Extract chunks and group by page number
          const chunkRegex = /<chunk[^>]*page="(\d+)"[^>]*>([^<]*)<\/chunk>/g;
          const pageMap = new Map<number, string[]>();

          // Clean up LaTeX and formatting
          function cleanPdfText(text: string): string {
            return (
              text
                // Remove LaTeX math mode markers
                .replace(/\$([^$]+)\$/g, "$1")
                // Clean up common LaTeX expressions
                .replace(/\\textcircled\s*\{[^}]*\}/g, "")
                .replace(/\\mathtt\s*\{([^}]*)\}/g, "$1")
                .replace(/\\mathsf\s*\{([^}]*)\}/g, "$1")
                .replace(/\\mathbb\s*\{([^}]*)\}/g, "$1")
                .replace(/\\mathrm\s*\{([^}]*)\}/g, "$1")
                .replace(/\\scriptstyle/g, "")
                .replace(/\\mathord\s*\{([^}]*)\}/g, "$1")
                .replace(/\\boxtimes/g, "")
                .replace(/\\[a-zA-Z]+\s*\{([^}]*)\}/g, "$1")
                // Clean up superscripts/subscripts
                .replace(/\^\s*\{([^}]*)\}/g, "^$1")
                .replace(/_\s*\{([^}]*)\}/g, "_$1")
                // Remove remaining backslashes from LaTeX
                .replace(/\\\\/g, " ")
                .replace(/\\,/g, " ")
                .replace(/\\;/g, " ")
                // Fix spacing issues
                .replace(/\s+/g, " ")
                .replace(/\s+\./g, ".")
                .replace(/\s+,/g, ",")
                .replace(/\(\s+/g, "(")
                .replace(/\s+\)/g, ")")
                .trim()
            );
          }

          let chunkMatch;
          while ((chunkMatch = chunkRegex.exec(xmlText)) !== null) {
            const pageNum = parseInt(chunkMatch[1], 10);
            const chunkText = cleanPdfText(chunkMatch[2]);
            if (chunkText) {
              if (!pageMap.has(pageNum)) {
                pageMap.set(pageNum, []);
              }
              pageMap.get(pageNum)!.push(chunkText);
            }
          }

          if (pageMap.size > 0) {
            // Extract PDF metadata
            const titleMatch = xmlText.match(/title="([^"]+)"/);
            const totalPagesMatch = xmlText.match(/totalPages=(\d+)/);
            const pdfTitle = titleMatch ? titleMatch[1] : "PDF Document";
            const totalPages = totalPagesMatch ? totalPagesMatch[1] : "?";

            // Sort pages and format as markdown
            const sortedPages = Array.from(pageMap.entries()).sort((a, b) => a[0] - b[0]);

            // Build header
            const header = `# ${pdfTitle}\n\n*Total Pages: ${totalPages}*\n\n---\n\n`;

            const pagesMarkdown = sortedPages
              .map(([pageNum, chunks]) => `### Page ${pageNum}\n\n${chunks.join("\n\n")}`)
              .join("\n\n---\n\n");

            setContent(header + pagesMarkdown);
            setCurrentStart(start);
            setNeedsParsing(false);
          } else {
            // Fallback: try to extract any text content from pdfCard
            const pdfCardMatch = xmlText.match(/<pdfCard[^>]*>([\s\S]*?)<\/pdfCard>/);
            if (pdfCardMatch) {
              const innerContent = pdfCardMatch[1].trim();
              if (innerContent && !innerContent.includes("not parsed yet")) {
                // Try simpler chunk extraction without page attribute
                const simpleChunkRegex = /<chunk[^>]*>([^<]+)<\/chunk>/g;
                const allChunks: string[] = [];
                let simpleMatch;
                while ((simpleMatch = simpleChunkRegex.exec(innerContent)) !== null) {
                  const text = simpleMatch[1].trim();
                  if (text) allChunks.push(text);
                }
                if (allChunks.length > 0) {
                  setContent(allChunks.join("\n\n"));
                  setNeedsParsing(false);
                } else {
                  setContent(innerContent);
                  setNeedsParsing(false);
                }
              } else {
                setNeedsParsing(true);
                setContent("⚠️ **PDF needs to be parsed first.** Press Enter to open in Heptabase.");
              }
            } else {
              // Show raw content for debugging
              setContent(`No structured content found.\n\n\`\`\`\n${xmlText.substring(0, 1500)}...\n\`\`\``);
            }
          }
        } else {
          setContent("No text content in response.");
        }
      } else {
        setContent("No content returned from API.");
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      setError(errorMessage);
      setContent(`**Error loading PDF pages:** ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }

  // Auto-load first pages on mount
  useEffect(() => {
    loadPages(1);
  }, [pdfCardId]);

  const canGoPrevious = currentStart > 1;
  const currentEnd = currentStart + pageSize - 1;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={needsParsing ? "PDF - Not Parsed" : `PDF Pages ${currentStart}-${currentEnd}`}
      markdown={content || "Loading PDF content..."}
      actions={
        <ActionPanel>
          {needsParsing ? (
            <>
              {heptabaseUrl && (
                <Action.OpenInBrowser title="Open in Heptabase to Parse" icon={Icon.Globe} url={heptabaseUrl} />
              )}
              <Action
                title="Retry Loading"
                icon={Icon.RotateClockwise}
                onAction={() => loadPages(1)}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </>
          ) : (
            <>
              {heptabaseUrl && (
                <Action.OpenInBrowser
                  title="Open in Heptabase"
                  icon={Icon.Globe}
                  url={heptabaseUrl}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
              )}
              <Action
                title={`Next ${pageSize} Pages`}
                icon={Icon.ArrowRight}
                onAction={() => loadPages(currentStart + pageSize)}
                shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
              />
              {canGoPrevious && (
                <Action
                  title={`Previous ${pageSize} Pages`}
                  icon={Icon.ArrowLeft}
                  onAction={() => loadPages(Math.max(1, currentStart - pageSize))}
                  shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
                />
              )}
              <Action
                title="Reload Current Pages"
                icon={Icon.RotateClockwise}
                onAction={() => loadPages(currentStart)}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <Action.CopyToClipboard
                title="Copy Content"
                content={content}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </>
          )}
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          {needsParsing ? (
            <Detail.Metadata.Label title="Status" text="⚠️ Needs Parsing" />
          ) : (
            <Detail.Metadata.Label title="Current Range" text={`Pages ${currentStart} - ${currentEnd}`} />
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="PDF Card ID" text={pdfCardId.substring(0, 8) + "..."} />
          {error && <Detail.Metadata.Label title="Error" text={`⚠️ ${error.substring(0, 30)}...`} />}
        </Detail.Metadata>
      }
    />
  );
}

/**
 * Search Heptabase using semantic search
 */
/**
 * Search Heptabase using semantic search
 */
export default function SearchHeptabase({ initialSearchText = "" }: { initialSearchText?: string } = {}) {
  const [searchText, setSearchText] = useState(initialSearchText);
  const [results, setResults] = useState<SearchResultObject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const searchRequestId = useRef(0);

  useEffect(() => {
    async function search() {
      if (!searchText.trim()) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      const requestId = ++searchRequestId.current;

      // Set loading when search actually starts (after debounce)
      setIsLoading(true);

      try {
        await authorize();
        const client = getHeptabaseMCPClient();

        // Split search text by comma for multiple queries
        const queries = searchText
          .split(",")
          .map((q) => q.trim())
          .filter(Boolean)
          .slice(0, 3);

        // Filter types
        const resultObjectTypes: string[] = filterType === "all" ? [] : [filterType];

        const result = (await client.callTool("semantic_search_objects", {
          queries,
          resultObjectTypes,
        })) as SemanticSearchResult;

        if (requestId !== searchRequestId.current) return;

        // Parse results from MCP response
        if (result.content && Array.isArray(result.content)) {
          const textContent = result.content.find((c) => c.type === "text");
          if (textContent) {
            // The API returns XML format where tag names are the types
            // e.g. <card id="..." title="...">, <journal id="...">, <pdfCard id="...">
            // Match tags like <card id="..."> or <journal id="..."> or <pdfCard id="...">
            const objectTypes = [
              "card",
              "journal",
              "pdfCard",
              "videoCard",
              "audioCard",
              "imageCard",
              "highlightElement",
              "mediaCard",
            ];
            const parsedObjects = parseHeptabaseList(textContent.text, objectTypes);

            const objects: SearchResultObject[] = parsedObjects.map((obj) => ({
              id: obj.id,
              type: obj.type as ObjectType,
              title: obj.title || undefined,
              preview: obj.content.substring(0, 200),
              content: obj.content,
            }));

            if (objects.length > 0) {
              setResults(objects);
            } else {
              // Fallback: show raw text as a single result
              setResults([
                {
                  id: "__raw__",
                  type: "card",
                  title: "Search Results",
                  content: textContent.text,
                },
              ]);
            }
          }
        } else {
          setResults([]);
        }
      } catch (e) {
        if (requestId !== searchRequestId.current) return;

        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error("Error searching:", e);

        await showToast({
          style: Toast.Style.Failure,
          title: "Search failed",
          message: errorMessage,
        });
        setResults([]);
      } finally {
        if (requestId === searchRequestId.current) {
          setIsLoading(false);
        }
      }
    }

    // Debounce search - show loading immediately when typing, but delay actual search
    if (searchText.trim()) {
      setIsLoading(true);
    }
    const timer = setTimeout(search, 500);
    return () => clearTimeout(timer);
  }, [searchText, filterType]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Heptabase (separate multiple queries with comma)..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by type" storeValue onChange={setFilterType}>
          <List.Dropdown.Item title="All Types" value="all" />
          <List.Dropdown.Item title="Cards" value="card" />
          <List.Dropdown.Item title="PDFs" value="pdfCard" />
          <List.Dropdown.Item title="Media" value="mediaCard" />
          <List.Dropdown.Item title="Journals" value="journal" />
          <List.Dropdown.Item title="Highlights" value="highlightElement" />
        </List.Dropdown>
      }
      throttle
    >
      {results.length === 0 && searchText ? (
        <List.EmptyView
          title={isLoading ? "Searching..." : "No results found"}
          description={isLoading ? `Searching for: ${searchText}` : `No matches for: ${searchText}`}
          icon={{ source: isLoading ? "⏳" : "🔍" }}
        />
      ) : (
        results.map((result, index) => {
          const getDisplayTitle = () => {
            if (result.title) return result.title;
            const content = result.content || result.preview || "";
            const match = content.match(/^\s*#\s+(.+)(\n|$)/);
            return match ? match[1].trim() : content.substring(0, 50) || "Untitled";
          };

          return (
            <List.Item
              key={`${result.id}-${index}`}
              icon={getObjectIcon(result.type)}
              title={getDisplayTitle()}
              subtitle={result.preview || result.content?.substring(0, 100)}
              accessories={[{ text: result.type }]}
              actions={
                <ActionPanel>
                  {(() => {
                    const preferences = getPreferenceValues<Preferences>();
                    const spaceId = preferences.spaceId;
                    const isMediaType = result.type === "pdfCard" || result.type === "mediaCard";

                    // For PDF and media types, open in Heptabase directly (can't display in Raycast)
                    if (isMediaType && result.id !== "__raw__") {
                      const heptabaseUrl = buildHeptabaseUrl(spaceId, result.type, result.id);
                      if (heptabaseUrl) {
                        return <Action.OpenInBrowser title="Open in Heptabase" icon={Icon.Globe} url={heptabaseUrl} />;
                      }
                    }

                    // For other types, show content in Raycast
                    return (
                      <Action.Push
                        title="View Full Content"
                        icon={Icon.Eye}
                        target={
                          <ObjectDetail
                            objectId={result.id}
                            objectType={result.type}
                            initialTitle={result.title}
                            initialContent={result.preview}
                          />
                        }
                      />
                    );
                  })()}
                  {(() => {
                    const preferences = getPreferenceValues<Preferences>();
                    const isMediaType = result.type === "pdfCard" || result.type === "mediaCard";

                    // For non-media types, also show "Open in Heptabase" as secondary action
                    if (!isMediaType && result.id !== "__raw__") {
                      const heptabaseUrl = buildHeptabaseUrl(preferences.spaceId, result.type, result.id);
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
                    }
                    return null;
                  })()}
                  {result.type === "pdfCard" && (
                    <Action.Push
                      title="View/Search PDF"
                      icon={Icon.Book}
                      target={<PDFDetail pdfCardId={result.id} />}
                    />
                  )}
                  {result.whiteboardIds && result.whiteboardIds.length > 0 && (
                    <Action.Push
                      title="View Whiteboard"
                      icon={Icon.AppWindowGrid2x2}
                      target={<WhiteboardDetail whiteboardId={result.whiteboardIds[0]} />}
                    />
                  )}
                  <Action.CopyToClipboard
                    title="Copy Title"
                    content={result.title || ""}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy ID"
                    content={result.id}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
