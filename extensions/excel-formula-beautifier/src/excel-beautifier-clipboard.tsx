import { Detail, Clipboard, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { ExcelFormulaBeautifier } from "./parser/excel-formula-parser";

interface FormulaData {
  original: string;
  beautified: string;
}

export default function Command() {
  const [formulaData, setFormulaData] = useState<FormulaData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function getClipboardContent() {
      try {
        const clipboardContent = await Clipboard.readText();
        if (!clipboardContent) {
          setError("No text found in clipboard");
          setIsLoading(false);
          return;
        }

        // Check if it looks like an Excel formula
        const trimmed = clipboardContent.trim();
        if (!trimmed.startsWith("=")) {
          // Try to beautify anyway, maybe user copied formula without =
          showToast({
            style: Toast.Style.Animated,
            title: "Warning",
            message: "Content doesn't start with '='. Treating as formula anyway.",
          });
        }

        try {
          // Use our custom formatter with the new parser
          const beautified = ExcelFormulaBeautifier.rawText(trimmed);
          setFormulaData({
            original: trimmed,
            beautified: beautified,
          });
        } catch (formulaError) {
          // If beautification fails, show error with the original content
          setError(
            `Invalid Excel formula: ${formulaError instanceof Error ? formulaError.message : String(formulaError)}`,
          );
          setIsLoading(false);
          return;
        }
        setIsLoading(false);
      } catch (err) {
        setError(`Failed to read clipboard: ${err}`);
        setIsLoading(false);
      }
    }

    getClipboardContent();
  }, []);

  if (isLoading) {
    return <Detail isLoading={true} markdown="Reading from clipboard..." />;
  }

  if (error) {
    return <Detail markdown={`# Error\n\n${error}`} />;
  }

  if (!formulaData) {
    return <Detail markdown="# No formula data available" />;
  }

  const markdown = `## Original Formula
\`\`\`excel
${formulaData.original}
\`\`\`

## Beautified Formula
\`\`\`excel
${formulaData.beautified}
\`\`\`
`;

  return <Detail markdown={markdown} />;
}
