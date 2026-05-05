import { Action, ActionPanel, Detail, Icon, environment, getPreferenceValues } from "@raycast/api";
import { ImagePreview } from "./components/ImagePreview";
import { getManagedBrowserSupportRoot } from "./utils/browser-manager";
import { useManualMermaidCommand } from "./hooks/use-manual-mermaid-command";
import { Preferences } from "./types";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const {
    state: { isLoading, error, browserSetup, imagePath, imageFormat, engineUsed, svgRasterStrategy, mermaidCode },
    actions: {
      runFromSelection,
      runFromClipboardOnly,
      retryBrowserSetup,
      downloadManagedBrowserAndRetry,
      cancelGeneration,
      cancelBrowserSetup,
    },
  } = useManualMermaidCommand(preferences);

  if (isLoading) {
    return (
      <Detail
        markdown="# Generating diagram, please wait..."
        isLoading={true}
        actions={
          <ActionPanel>
            <Action title="Cancel" icon={Icon.XMarkCircle} onAction={cancelGeneration} />
          </ActionPanel>
        }
      />
    );
  }

  if (error) {
    return (
      <Detail
        markdown={`# Diagram Generation Failed

${error}

## Common Solutions:
- Select text containing Mermaid syntax or copy it to clipboard
- Ensure your Mermaid syntax is valid
- Check that your diagram starts with a proper declaration (like \`graph TD\` or \`sequenceDiagram\`)
- Make sure Mermaid CLI is properly installed
- If selection doesn't work, try copying the text to clipboard

**Input Priority:** Selected text > Clipboard content

### Troubleshooting:
- Some applications may not support text selection properly
- Try using the copy function if selection fails
- Ensure there are no special characters that might cause issues

[View Mermaid Syntax Documentation](https://mermaid.js.org/syntax/flowchart.html)`}
        actions={
          <ActionPanel>
            <Action
              title="Try Again"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => runFromSelection()}
            />
            <Action
              title="Use Clipboard Only"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
              onAction={runFromClipboardOnly}
            />
            <Action title="Cancel" icon={Icon.XMarkCircle} onAction={cancelBrowserSetup} />
          </ActionPanel>
        }
      />
    );
  }

  if (browserSetup) {
    const managedBrowserPath = getManagedBrowserSupportRoot(environment.supportPath);
    return (
      <Detail
        markdown={`# Browser Setup Required

${browserSetup.reason}

No compatible Chrome/Chromium browser was found in your environment. Mermaid to Image can download a managed browser and store it locally here:

\`${managedBrowserPath}\`

The managed browser is used for compatible rendering and for SVG preview/copy cases that need browser-backed rasterization.`}
        actions={
          <ActionPanel>
            <Action
              title="Download Browser"
              icon={Icon.Download}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={downloadManagedBrowserAndRetry}
            />
            <Action
              title="Try Again"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={retryBrowserSetup}
            />
            <Action title="Cancel" icon={Icon.XMarkCircle} onAction={cancelBrowserSetup} />
          </ActionPanel>
        }
      />
    );
  }

  if (imagePath) {
    return (
      <ImagePreview
        imagePath={imagePath}
        format={imageFormat}
        engineLabel={engineUsed}
        svgRasterStrategy={svgRasterStrategy}
        mermaidCode={mermaidCode}
      />
    );
  }

  return (
    <Detail
      markdown={`# Ready to generate diagram

Select text containing Mermaid code or copy it to your clipboard, then press the Generate button.

**Input Priority:** Selected text > Clipboard content

## Example Mermaid syntax:
\`\`\`mermaid
graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B
\`\`\`

## Tips:
- If text selection doesn't work in your application, use copy instead
- Make sure to select/copy the entire Mermaid code including the diagram type declaration
- Some applications may have limitations with text selection

*Note: Make sure your text contains valid Mermaid syntax.*`}
      actions={
        <ActionPanel>
          <Action
            title="Generate Diagram"
            icon={Icon.Wand}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={() => runFromSelection()}
          />
          <Action
            title="Generate from Clipboard Only"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            onAction={runFromClipboardOnly}
          />
        </ActionPanel>
      }
    />
  );
}
