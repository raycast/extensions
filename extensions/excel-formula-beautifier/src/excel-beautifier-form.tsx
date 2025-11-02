import { Form, ActionPanel, Action } from "@raycast/api";
import { useState, useCallback, useEffect } from "react";
import { ExcelFormulaBeautifier } from "./parser/excel-formula-parser";

export default function Command() {
  const [formula, setFormula] = useState<string>("");
  const [beautifiedFormula, setBeautifiedFormula] = useState<string>("");
  const [error, setError] = useState<string>("");

  const beautifyFormula = useCallback((inputFormula: string) => {
    if (!inputFormula.trim()) {
      setBeautifiedFormula("");
      setError("");
      return;
    }

    try {
      // Ensure formula starts with =
      const formulaWithEquals = inputFormula.trim().startsWith("=") ? inputFormula.trim() : "=" + inputFormula.trim();

      // Use our custom formatter with the enhanced parser
      const beautified = ExcelFormulaBeautifier.rawText(formulaWithEquals);

      setBeautifiedFormula(beautified);
      setError("");
    } catch (formulaError) {
      setBeautifiedFormula("");
      setError(formulaError instanceof Error ? formulaError.message : String(formulaError));
    }
  }, []);

  // Debounce the beautification to avoid too many calls while typing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      beautifyFormula(formula);
    }, 300); // 300ms delay

    return () => clearTimeout(timeoutId);
  }, [formula, beautifyFormula]);

  const handleFormulaChange = (value: string) => {
    setFormula(value);
  };

  const handleClear = () => {
    setFormula("");
    setBeautifiedFormula("");
    setError("");
  };

  const getResultPreview = () => {
    return beautifiedFormula;
  };

  const getStatusMessage = () => {
    if (error) {
      // Make parser errors more user-friendly
      let friendlyError = error;
      if (error.includes("Parse error")) {
        friendlyError =
          "Invalid formula syntax - please check for missing parentheses, quotes, or incomplete expressions";
      }
      return `❌ ${friendlyError}`;
    }

    if (!beautifiedFormula && !formula.trim()) {
      return `📝 Enter a formula above to see the beautified result.

Examples to try:
• SUM(A1:B10)+AVERAGE(C1:C10)
• IF(A1>0,B1*2,C1-1)
• VLOOKUP(D1,Sheet1!A:B,2,FALSE)`;
    }

    if (!beautifiedFormula && formula.trim()) {
      return "⏳ Processing...";
    }

    return "✅ Formula beautified successfully!";
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Clear" onAction={handleClear} shortcut={{ modifiers: ["cmd"], key: "l" }} />
          {beautifiedFormula && (
            <Action.CopyToClipboard
              title="Copy Beautified Formula"
              content={beautifiedFormula}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          )}
          {formula && (
            <Action.CopyToClipboard
              title="Copy Original Formula"
              content={formula.trim().startsWith("=") ? formula.trim() : "=" + formula.trim()}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="formula"
        title="Excel Formula"
        placeholder="Enter your Excel formula here (e.g., =SUM(A1:B10)+IF(C1>0,D1*2,0))"
        value={formula}
        onChange={handleFormulaChange}
        info="Type your formula and see the beautified result below"
      />

      <Form.Separator />

      <Form.Description title="" text={getStatusMessage()} />

      {beautifiedFormula && (
        <Form.TextArea
          id="beautified"
          title="Beautified Result"
          value={getResultPreview()}
          onChange={() => {}} // Make it read-only
        />
      )}
    </Form>
  );
}
