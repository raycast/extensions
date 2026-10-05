import { Detail, Clipboard, showToast, Toast, ActionPanel, Action } from "@raycast/api";
import { useEffect, useState } from "react";
import { ExcelFormulaBeautifier } from "./parser/excel-formula-parser";
import { ExcelFormulaParser } from "./parser/parser";
import { extractFormulasFromExpression } from "./parser/formula-extractor";

export default function Command() {
  const [beautified, setBeautified] = useState<string | null>(null);
  const [formulas, setFormulas] = useState<ReturnType<typeof extractFormulasFromExpression>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function getClipboardContent() {
      try {
        const clipboardContent = await Clipboard.readText();
        if (!clipboardContent) {
          showToast({
            style: Toast.Style.Failure,
            title: "Error",
            message: "No text found in clipboard",
          });
          setIsLoading(false);
          return;
        }

        // Check if it looks like an Excel formula
        const trimmed = clipboardContent.trim();
        if (!trimmed.startsWith("=")) {
          showToast({
            style: Toast.Style.Animated,
            title: "Warning",
            message: "Content doesn't start with '='. Treating as formula anyway.",
          });
        }

        try {
          // Use our custom formatter with the new parser
          const result = ExcelFormulaBeautifier.rawText(trimmed);
          setBeautified(result);

          // Extract formulas used in the expression
          const parsed = ExcelFormulaParser.parse(trimmed);
          const usedFormulas = extractFormulasFromExpression(parsed);
          setFormulas(usedFormulas);

          showToast({
            style: Toast.Style.Success,
            title: "Success",
            message: "Formula beautified",
          });
        } catch (formulaError) {
          showToast({
            style: Toast.Style.Failure,
            title: "Invalid Excel formula",
            message: formulaError instanceof Error ? formulaError.message : String(formulaError),
          });
        }
        setIsLoading(false);
      } catch (err) {
        showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: `Failed to read clipboard: ${err}`,
        });
        setIsLoading(false);
      }
    }

    getClipboardContent();
  }, []);

  if (isLoading) {
    return <Detail isLoading={true} markdown="Reading from clipboard..." />;
  }

  if (!beautified) {
    return <Detail markdown="# No formula data available" />;
  }

  const markdown = `# Beautified Formula

\`\`\`excel
${beautified}
\`\`\`
`;

  const getCategoryColor = (category: string | undefined): string => {
    const colorMap: Record<string, string> = {
      Basic: "#4CAF50",
      Conditional: "#2196F3",
      Lookup: "#FF9800",
      Text: "#9C27B0",
      Math: "#F44336",
      Date: "#00BCD4",
    };
    return colorMap[category || ""] || "#9E9E9E";
  };

  const renderDocumentation = () => {
    const elements: React.ReactNode[] = [];
    formulas.forEach((formula) => {
      elements.push(
        <Detail.Metadata.Label
          key={`${formula.name}-desc`}
          title={formula.name}
          text={formula.doc?.description || "No documentation available"}
        />,
      );
      if (formula.doc) {
        elements.push(
          <Detail.Metadata.TagList key={`${formula.name}-cat`} title="Category">
            <Detail.Metadata.TagList.Item text={formula.doc.category} color={getCategoryColor(formula.doc.category)} />
          </Detail.Metadata.TagList>,
        );
        elements.push(<Detail.Metadata.Label key={`${formula.name}-syn`} title="Syntax" text={formula.doc.syntax} />);
        elements.push(<Detail.Metadata.Label key={`${formula.name}-ex`} title="Example" text={formula.doc.example} />);
        elements.push(<Detail.Metadata.Separator key={`${formula.name}-sep`} />);
      }
    });

    return elements;
  };

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          {formulas.length > 0 && (
            <>
              <Detail.Metadata.TagList title="Formulas Used">
                {formulas.map((formula) => (
                  <Detail.Metadata.TagList.Item
                    key={formula.name}
                    text={`${formula.name}${formula.count > 1 ? ` ×${formula.count}` : ""}`}
                    color={getCategoryColor(formula.doc?.category)}
                  />
                ))}
              </Detail.Metadata.TagList>

              <Detail.Metadata.Separator />

              {renderDocumentation()}
            </>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Beautified Formula"
            content={beautified}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
