import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState, useCallback, useEffect } from "react";
import { ExcelFormulaBeautifier } from "./parser/excel-formula-parser";

export default function Command() {
  const [formula, setFormula] = useState<string>("");
  const [beautifiedFormula, setBeautifiedFormula] = useState<string>("");

  const beautifyFormula = useCallback((inputFormula: string) => {
    if (!inputFormula.trim()) {
      setBeautifiedFormula("");
      return;
    }

    try {
      // Ensure formula starts with =
      const formulaWithEquals = inputFormula.trim().startsWith("=") ? inputFormula.trim() : "=" + inputFormula.trim();

      // Use our custom formatter with the enhanced parser
      const beautified = ExcelFormulaBeautifier.rawText(formulaWithEquals);

      setBeautifiedFormula(beautified);
      showToast({
        style: Toast.Style.Success,
        title: "Formula beautified",
      });
    } catch (formulaError) {
      setBeautifiedFormula("");
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid Excel formula",
        message: formulaError instanceof Error ? formulaError.message : String(formulaError),
      });
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
  };

  const getResultPreview = () => {
    return beautifiedFormula;
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
        placeholder="Enter your Excel formula here (e.g., =SUM(A1:B10)+IF(C1>0,D1*2,IF(C1>0,D1*2,0))"
        value={formula}
        onChange={handleFormulaChange}
        info="Type your formula and see the beautified result below"
      />

      <Form.Separator />

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
