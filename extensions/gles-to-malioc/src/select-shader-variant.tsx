import { useState, useRef, useEffect } from "react";
import { List, ActionPanel, Action, getSelectedText, showToast, Toast, useNavigation, Icon, Color } from "@raycast/api";
import { parseCompiledShader, variantsToListItems } from "./lib/shader-parser";
import { ResultView, getDefaultGpuCore, processShader, getAvailableGpuCores, type GpuCore } from "./compile-shader";

type ShaderTypeFilter = "all" | "vertex" | "fragment";

// Maximum total character count for displayed keywords in tags
const MAX_KEYWORDS_DISPLAY_LENGTH = 53;
// Maximum total character count for section title keywords
const MAX_SECTION_TITLE_LENGTH = 80;

// Shader type icon tint colors
const VERTEX_SHADER_COLOR = "#0000FF"; // Digital blue
const FRAGMENT_SHADER_COLOR = "#FF00FF"; // Compilation magenta

const KEYWORD_COLORS = [Color.Blue, Color.Green, Color.Magenta, Color.Orange, Color.Purple, Color.Red, Color.Yellow];

/**
 * Build a color map for keywords based on alphabetical order
 * This ensures maximum color diversity and deterministic assignment
 */
function buildKeywordColorMap(items: ReturnType<typeof variantsToListItems>): Map<string, Color> {
  // Collect all unique keywords
  const uniqueKeywords = new Set<string>();
  items.forEach((item) => {
    if (item.keywords[0] !== "<none>") {
      item.keywords.forEach((kw) => uniqueKeywords.add(kw));
    }
  });

  // Sort alphabetically for deterministic assignment
  const sortedKeywords = Array.from(uniqueKeywords).sort();

  // Assign colors round-robin
  const colorMap = new Map<string, Color>();
  sortedKeywords.forEach((keyword, index) => {
    colorMap.set(keyword, KEYWORD_COLORS[index % KEYWORD_COLORS.length]);
  });

  return colorMap;
}

export default function SelectShaderVariant() {
  const [typeFilter, setTypeFilter] = useState<ShaderTypeFilter>("all");
  const [shaderContent, setShaderContent] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [defaultGpuCore, setDefaultGpuCore] = useState<string | null>(null);
  const [sessionGpuCore, setSessionGpuCore] = useState<string | null>(null); // Session-specific core

  // Generate unique launch ID to detect new command launches
  const [launchId] = useState(() => Date.now());
  const fetchedLaunchIdRef = useRef<number | null>(null);

  const { push } = useNavigation();

  // Load default GPU core on mount
  useEffect(() => {
    async function loadDefaultCore() {
      const core = await getDefaultGpuCore();
      setDefaultGpuCore(core);
    }
    loadDefaultCore();
  }, []);

  useEffect(() => {
    // Skip if already fetched for this launch
    if (fetchedLaunchIdRef.current === launchId) {
      console.log(`[SelectVariant] Already fetched for launch ${launchId}, skipping`);
      return;
    }

    async function loadShaderContent() {
      fetchedLaunchIdRef.current = launchId;
      console.log(`[SelectVariant] Loading for launch ${launchId}...`);

      try {
        setIsLoading(true);
        setError(null);

        const text = await getSelectedText();
        console.log(`[SelectVariant] Got ${text.length} chars`);

        if (!text.trim()) {
          throw new Error("No text selected. Please select a compiled shader file content.");
        }

        setShaderContent(text);
      } catch (err) {
        console.error(`[SelectVariant] Error:`, err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    }

    loadShaderContent();
  }, [launchId]); // Re-run when launchId changes (new command launch)

  const revalidate = () => {
    console.log(`[SelectVariant] Manual reload triggered`);
    setShaderContent(null);
    setError(null);
    setIsLoading(true);

    // Reset the fetch flag and fetch again
    fetchedLaunchIdRef.current = null;

    setTimeout(async () => {
      try {
        const text = await getSelectedText();
        console.log(`[SelectVariant] Reload: got ${text.length} chars`);

        if (!text.trim()) {
          throw new Error("No text selected. Please select a compiled shader file content.");
        }

        setShaderContent(text);
        fetchedLaunchIdRef.current = launchId;
      } catch (err) {
        console.error(`[SelectVariant] Reload error:`, err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    }, 100);
  };

  if (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return (
      <List>
        <List.EmptyView
          icon={{ source: "⚠️" }}
          title="Error Loading Shader"
          description={errorMessage}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <Action.CopyToClipboard title="Copy Error" content={errorMessage} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (!shaderContent) {
    return <List isLoading={true} />;
  }

  // Parse shader content
  const variants = parseCompiledShader(shaderContent);
  const items = variantsToListItems(variants);

  // Build color map for keywords
  const keywordColorMap = buildKeywordColorMap(items);

  // Filter by type
  const filteredItems = items.filter((item) => {
    if (typeFilter === "all") return true;
    return item.type === typeFilter;
  });

  // Group by keywords
  const groupedByKeywords = new Map<string, typeof filteredItems>();
  for (const item of filteredItems) {
    const key = item.keywordsDisplay || "<none>";
    if (!groupedByKeywords.has(key)) {
      groupedByKeywords.set(key, []);
    }
    groupedByKeywords.get(key)!.push(item);
  }

  async function handleCompileShader(code: string, type: "vertex" | "fragment") {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Compiling shader..." });

      // Use session core if set, otherwise use default
      const coreToUse = sessionGpuCore || defaultGpuCore;
      if (!coreToUse) {
        throw new Error(
          "No default GPU core selected. Please select a core with 'Select GPU Core for Session' action or set a default GPU core in 'Compile Shader with MaliOC' command.",
        );
      }

      // Process shader
      const output = await processShader(code, type, coreToUse, "json");

      // Show result in ResultView with json mode
      push(<ResultView output={output} mode="json" />);

      await showToast({
        style: Toast.Style.Success,
        title: "Compiling Complete",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await showToast({
        style: Toast.Style.Failure,
        title: "Compiling Failed",
        message,
      });
    }
  }

  // Build navigation title with session core indicator
  const navTitle = sessionGpuCore
    ? `Shader Variants (${filteredItems.length}) · Session: ${sessionGpuCore}`
    : `Shader Variants (${filteredItems.length})`;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter shader variants..."
      navigationTitle={navTitle}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Shader Type"
          value={typeFilter}
          onChange={(value) => setTypeFilter(value as ShaderTypeFilter)}
        >
          <List.Dropdown.Item title="All Types" value="all" />
          <List.Dropdown.Item title="Vertex Only" value="vertex" />
          <List.Dropdown.Item title="Fragment Only" value="fragment" />
        </List.Dropdown>
      }
    >
      {filteredItems.length === 0 ? (
        <List.EmptyView
          icon={{ source: "🔍" }}
          title="No Shader Variants Found"
          description={`Loaded ${shaderContent?.length || 0} chars. Check shader file format or reload.`}
          actions={
            <ActionPanel>
              <Action
                title="Reload Shader Content"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ) : (
        Array.from(groupedByKeywords.entries()).map(([keywordsKey, groupItems]) => {
          // Build smart section title with keyword limit
          const keywords = keywordsKey.split(" ");
          let sectionTitle = "KW: ";
          let totalLength = 0;
          let displayedCount = 0;
          const displayedKeywords: string[] = [];

          for (const keyword of keywords) {
            if (totalLength + keyword.length <= MAX_SECTION_TITLE_LENGTH) {
              displayedKeywords.push(keyword);
              totalLength += keyword.length;
              displayedCount++;
            } else {
              break;
            }
          }

          sectionTitle += displayedKeywords.join(", ");
          const remainingCount = keywords.length - displayedCount;
          let sectionSubtitle: string | undefined = undefined;

          if (remainingCount > 0) {
            sectionTitle += " ...";
            // Show remaining count in subtitle
            sectionSubtitle = `+ ${remainingCount}`;
          }

          return (
            <List.Section key={keywordsKey} title={sectionTitle} subtitle={sectionSubtitle}>
              {groupItems.map((item) => {
                // Build accessories: keyword tags first, then shader type at the end (rightmost)
                const accessories: List.Item.Accessory[] = [];

                // Add keyword tags first (skip <none>)
                if (item.keywords.length > 0 && item.keywords[0] !== "<none>") {
                  const allKeywords = item.keywords.join(", ");
                  let totalLength = 0;
                  let displayedCount = 0;
                  const displayedKeywords: Array<{ keyword: string; color: Color }> = [];

                  // Show keywords from the end (reverse order) while total length doesn't exceed limit
                  for (let i = item.keywords.length - 1; i >= 0; i--) {
                    const keyword = item.keywords[i];
                    if (totalLength + keyword.length <= MAX_KEYWORDS_DISPLAY_LENGTH) {
                      displayedKeywords.unshift({
                        keyword,
                        color: keywordColorMap.get(keyword) || Color.SecondaryText,
                      });
                      totalLength += keyword.length;
                      displayedCount++;
                    } else {
                      // Check if we can show truncated version
                      const remainingSpace = MAX_KEYWORDS_DISPLAY_LENGTH - totalLength;
                      const minSpace = MAX_KEYWORDS_DISPLAY_LENGTH * 0.1;
                      const halfKeyword = keyword.length / 2;

                      if (remainingSpace > minSpace && remainingSpace >= halfKeyword) {
                        // Truncate keyword: take last (remainingSpace - 1) chars and add ellipsis
                        const charsToShow = remainingSpace - 1; // -1 for ellipsis
                        const truncated = "…" + keyword.slice(-charsToShow);
                        displayedKeywords.unshift({
                          keyword: truncated,
                          color: keywordColorMap.get(keyword) || Color.SecondaryText, // Use original keyword for color consistency
                        });
                        displayedCount++;
                      }
                      break;
                    }
                  }

                  // If there are more keywords that didn't fit, show "+ n" first
                  const remainingCount = item.keywords.length - displayedCount;
                  if (remainingCount > 0) {
                    accessories.push({
                      tag: {
                        value: `+ ${remainingCount}`,
                        color: Color.SecondaryText,
                      },
                      tooltip: allKeywords,
                    });
                  }

                  // Add displayed keywords
                  displayedKeywords.forEach(({ keyword, color }) => {
                    accessories.push({
                      tag: {
                        value: keyword,
                        color,
                      },
                      tooltip: allKeywords,
                    });
                  });
                }

                // Shader type is now shown as icon, not in accessories

                // Build subtitle: tier + pass info (short form)
                const subtitleParts: string[] = [];
                const tooltipParts: string[] = [];

                if (item.tier) {
                  // Extract tier number from "Tier 1" -> "1"
                  const tierMatch = item.tier.match(/\d+/);
                  const tierNum = tierMatch ? tierMatch[0] : item.tier;
                  subtitleParts.push(`T${tierNum}`);
                  tooltipParts.push(item.tier); // Full: "Tier 1"
                }

                if (item.passIndex !== undefined) {
                  subtitleParts.push(`P${item.passIndex}`);
                  // Full: "Pass 0: "name"" or "Pass 0: [unnamed]"
                  const passTooltip = item.passName
                    ? `Pass ${item.passIndex}: "${item.passName}"`
                    : `Pass ${item.passIndex}: [unnamed]`;
                  tooltipParts.push(passTooltip);
                }

                // Create subtitle with tooltip
                const subtitleText = subtitleParts.length > 0 ? subtitleParts.join(" · ") : undefined;
                const tooltipText = tooltipParts.length > 0 ? tooltipParts.join("  •  ") : undefined;

                const subtitle =
                  tooltipText && subtitleText
                    ? {
                        value: subtitleText,
                        tooltip: tooltipText,
                      }
                    : subtitleText;

                // Determine icon and color based on shader type
                const shaderIcon =
                  item.type === "vertex"
                    ? { source: "vertex.svg", tintColor: VERTEX_SHADER_COLOR }
                    : { source: "fragment.svg", tintColor: FRAGMENT_SHADER_COLOR };
                const shaderTooltip = item.type === "vertex" ? "Vertex Shader" : "Fragment Shader";

                const currentCore = sessionGpuCore || defaultGpuCore;

                return (
                  <List.Item
                    key={item.id}
                    icon={{ tooltip: shaderTooltip, value: shaderIcon }}
                    title={item.lineNumber ? `Ln ${item.lineNumber}` : "Unknown Line"}
                    subtitle={subtitle}
                    keywords={[item.type, ...item.keywords]}
                    accessories={accessories}
                    actions={
                      <ActionPanel>
                        <Action
                          title={currentCore ? `Compile for ${currentCore}` : "Compile with Malioc"}
                          onAction={() => handleCompileShader(item.code, item.type)}
                        />
                        <Action.CopyToClipboard title="Copy Shader Code" content={item.code} />
                        <Action
                          title="Select Gpu Core for Session"
                          icon={Icon.ComputerChip}
                          onAction={() =>
                            push(<SelectGpuCoreView onSelect={setSessionGpuCore} currentCore={currentCore} />)
                          }
                          shortcut={{ modifiers: ["cmd"], key: "g" }}
                        />
                        <Action
                          title="Reload Shader Content"
                          icon={Icon.ArrowClockwise}
                          onAction={revalidate}
                          shortcut={{ modifiers: ["cmd"], key: "r" }}
                        />
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          );
        })
      )}
    </List>
  );
}

// --- GPU Core Selection View ---
function SelectGpuCoreView({
  onSelect,
  currentCore,
}: {
  onSelect: (core: string) => void;
  currentCore: string | null;
}) {
  const [cores, setCores] = useState<GpuCore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { pop } = useNavigation();

  useEffect(() => {
    async function loadCores() {
      try {
        setIsLoading(true);
        const availableCores = await getAvailableGpuCores();
        setCores(availableCores);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    }
    loadCores();
  }, []);

  if (error) {
    return (
      <List>
        <List.EmptyView title="Failed to Load GPU Cores" description={error.message} />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} navigationTitle="Select GPU Core for Session">
      {cores.map((core) => (
        <List.Item
          key={core.id}
          title={core.name}
          icon={currentCore === core.id ? Icon.CheckCircle : Icon.Circle}
          accessories={[currentCore === core.id ? { tag: { value: "Current", color: Color.Green } } : {}]}
          actions={
            <ActionPanel>
              <Action
                title="Select This Core"
                icon={Icon.CheckCircle}
                onAction={() => {
                  onSelect(core.id);
                  showToast({
                    style: Toast.Style.Success,
                    title: "GPU Core Selected",
                    message: `Session will use ${core.name}`,
                  });
                  pop();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
