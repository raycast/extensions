import { Detail, ActionPanel, Action } from "@raycast/api";

type WrapStyle = "none" | "single" | "double";

interface LatexPreviewDetailProps {
  latex: string;
  wrapStyle: WrapStyle;
  onEdit: () => void;
}

function getWrappedLatex(latex: string, wrapStyle: WrapStyle) {
  if (wrapStyle === "double") return `$$${latex}$$`;
  if (wrapStyle === "single") return `$${latex}$`;
  return latex;
}

export default function LatexPreviewDetail({
  latex,
  wrapStyle,
  onEdit,
}: Pick<LatexPreviewDetailProps, "latex" | "wrapStyle" | "onEdit">) {
  // Always use display math for maximum size
  // Always use display math for preview, with \huge
  const renderedMath = `$$\\huge ${latex}$$`;
  // Use original latex with user-selected wrapping for copying/pasting (no \huge)
  const copyableMath = getWrappedLatex(latex, wrapStyle);

  return (
    <Detail
      navigationTitle="LaTeX Preview"
      markdown={`
${renderedMath}
`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            content={copyableMath}
            title="Copy Latex Code"
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action title="Edit Asciimath Expression" onAction={onEdit} shortcut={{ modifiers: ["cmd"], key: "e" }} />
          <Action.Paste
            content={copyableMath}
            title="Paste Latex Code"
            shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
          />
        </ActionPanel>
      }
    />
  );
}
