import { useState } from "react";
import { Form, ActionPanel, Action, useNavigation } from "@raycast/api";
import LatexPreviewDetail from "./LatexPreviewDetail";
import { convertAsciiMathToLatex } from "../utils/asciimath";

export type WrapStyle = "none" | "single" | "double";

function getWrappedLatex(latex: string, wrapStyle: WrapStyle) {
  if (wrapStyle === "double") return `$$${latex}$$`;
  if (wrapStyle === "single") return `$${latex}$`;
  return latex;
}

interface MathToLatexLivePanelProps {
  defaultWrapLatex: WrapStyle; // Changed from boolean to WrapStyle
}

export default function MathToLatexLivePanel({ defaultWrapLatex }: MathToLatexLivePanelProps) {
  const [input, setInput] = useState("");
  // Use the passed preference directly as the initial state
  const [wrapStyle, setWrapStyle] = useState<WrapStyle>(defaultWrapLatex);
  const [latex, setLatex] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { push, pop } = useNavigation();

  // Live conversion
  function handleInputChange(value: string) {
    setInput(value);
    try {
      const latexResult = convertAsciiMathToLatex(value);
      setLatex(latexResult);
      setError(null);
    } catch (e: unknown) {
      setLatex("");
      if (e && typeof e === "object" && "message" in e && typeof (e as { message: string }).message === "string") {
        setError((e as { message: string }).message);
      } else {
        setError("Conversion failed");
      }
    }
  }

  function handleWrapChange(value: string) {
    setWrapStyle(value as WrapStyle);
    // Re-convert to update wrapping
    try {
      const latexResult = convertAsciiMathToLatex(input);
      setLatex(latexResult);
      setError(null);
    } catch (e: unknown) {
      setLatex("");
      if (e && typeof e === "object" && "message" in e && typeof (e as { message: string }).message === "string") {
        setError((e as { message: string }).message);
      } else {
        setError("Conversion failed");
      }
    }
  }

  const wrappedLatex = getWrappedLatex(latex, wrapStyle);

  return (
    <Form
      navigationTitle="AsciiMath to LaTeX Converter"
      actions={
        <ActionPanel>
          {latex && (
            <Action
              title="Show Rendered Preview"
              onAction={() => push(<LatexPreviewDetail latex={latex} wrapStyle={wrapStyle} onEdit={pop} />)}
              shortcut={{ modifiers: [], key: "enter" }}
            />
          )}
          <Action.CopyToClipboard
            content={wrappedLatex}
            title="Copy LaTeX Code"
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.Paste
            content={wrappedLatex}
            title="Paste LaTeX Code"
            shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="input"
        title="AsciiMath Expression"
        placeholder="Enter math expression, e.g., x^2 + y^2 = z^2"
        value={input}
        onChange={handleInputChange}
        autoFocus
      />
      <Form.Dropdown id="wrapStyle" title="LaTeX Wrapping Style" value={wrapStyle} onChange={handleWrapChange}>
        <Form.Dropdown.Item value="none" title="None" />
        <Form.Dropdown.Item value="single" title="Single ($...$)" />
        <Form.Dropdown.Item value="double" title="Double ($$...$$)" />
      </Form.Dropdown>
      <Form.Description title="LaTeX Output" text={latex ? wrappedLatex : "No LaTeX output available."} />
      {error && <Form.Description title="Conversion Error" text={`An error occurred: ${error}`} />}
    </Form>
  );
}
