import { ActionPanel, Action, Form, showToast, Toast, Detail, Icon, Clipboard } from "@raycast/api";
import { useState } from "react";

interface ConversionData {
  mainResult: string;
  cm: string;
  mm: string;
  inches: string;
  px: string;
  dpiValue: number;
  calculations: string[];
}

export default function Command() {
  const [conversionData, setConversionData] = useState<ConversionData | null>(null);
  const [showResult, setShowResult] = useState(false);

  function parseInput(input: string): { value: number; unit: string } | null {
    if (!input || input.trim() === "") return null;
    
    const normalized = input.replace(",", ".").trim();
    const match = normalized.match(/^(\d+\.?\d*)\s*(px|cm|mm|in)?$/i);
    
    if (!match) return null;
    
    return {
      value: parseFloat(match[1]),
      unit: match[2] ? match[2].toLowerCase() : "",
    };
  }

  function convertFromPixels(px: number, dpi: number) {
    const cm = ((px / dpi) * 2.54).toFixed(2);
    const mm = ((px / dpi) * 25.4).toFixed(2);
    const inches = (px / dpi).toFixed(2);
    
    return { cm, mm, inches };
  }

  function convertToPixels(value: number, unit: string, dpi: number): number {
    switch (unit) {
      case "cm":
        return Math.round((value / 2.54) * dpi);
      case "mm":
        return Math.round((value / 25.4) * dpi);
      case "in":
        return Math.round(value * dpi);
      default:
        return 0;
    }
  }

  async function handleSubmit(values: { dimension1: string; dimension2?: string; dpi: string }) {
    const dpiValue = parseInt(values.dpi) || 300;
    
    const parsed1 = parseInput(values.dimension1);
    if (!parsed1) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid format",
        message: "Use format: number + unit (e.g.: 3000px, 25cm, 8.5in)",
      });
      return;
    }

    let parsed2: { value: number; unit: string } | null = null;
    if (values.dimension2 && values.dimension2.trim() !== "") {
      parsed2 = parseInput(values.dimension2);
      
      if (!parsed2) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid format",
          message: "Use format: number + unit (e.g.: 3000px, 25cm, 8.5in)",
        });
        return;
      }
      
      if (!parsed2.unit && parsed1.unit) {
        parsed2.unit = parsed1.unit;
      }
      
      if (!parsed1.unit && parsed2.unit) {
        parsed1.unit = parsed2.unit;
      }
      
      if (parsed1.unit && parsed2.unit && parsed2.unit !== parsed1.unit) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Unit mismatch",
          message: "Both dimensions must have the same unit",
        });
        return;
      }
    }

    if (!parsed1.unit) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing unit",
        message: "Please specify a unit (px, cm, mm, in)",
      });
      return;
    }

    // Prepare conversion data
    let data: ConversionData;

    if (parsed1.unit === "px") {
      const conv1 = convertFromPixels(parsed1.value, dpiValue);
      
      if (parsed2) {
        const conv2 = convertFromPixels(parsed2.value, dpiValue);
        data = {
          mainResult: `${conv1.cm} × ${conv2.cm} cm`,
          cm: `${conv1.cm} × ${conv2.cm}`,
          mm: `${conv1.mm} × ${conv2.mm}`,
          inches: `${conv1.inches} × ${conv2.inches}`,
          px: `${parsed1.value} × ${parsed2.value}`,
          dpiValue: dpiValue,
          calculations: [
            `① : (${parsed1.value} px ÷ ${dpiValue} dpi) × 2.54 = ${conv1.cm} cm`,
            `② : (${parsed2.value} px ÷ ${dpiValue} dpi) × 2.54 = ${conv2.cm} cm`,
          ],
        };
      } else {
        data = {
          mainResult: `${conv1.cm} cm`,
          cm: conv1.cm,
          mm: conv1.mm,
          inches: conv1.inches,
          px: `${parsed1.value}`,
          dpiValue: dpiValue,
          calculations: [
            `(${parsed1.value} px ÷ ${dpiValue} dpi) × 2.54 = ${conv1.cm} cm`,
          ],
        };
      }
    } else {
      const px1 = convertToPixels(parsed1.value, parsed1.unit, dpiValue);
      const conv1 = convertFromPixels(px1, dpiValue);
      
      if (parsed2) {
        const px2 = convertToPixels(parsed2.value, parsed2.unit, dpiValue);
        const conv2 = convertFromPixels(px2, dpiValue);
        
        const calcs = [];
        switch (parsed1.unit) {
          case "cm":
            calcs.push(`① : (${parsed1.value} cm ÷ 2.54) × ${dpiValue} dpi = ${px1} px`);
            calcs.push(`② : (${parsed2.value} cm ÷ 2.54) × ${dpiValue} dpi = ${px2} px`);
            break;
          case "mm":
            calcs.push(`① : (${parsed1.value} mm ÷ 25.4) × ${dpiValue} dpi = ${px1} px`);
            calcs.push(`② : (${parsed2.value} mm ÷ 25.4) × ${dpiValue} dpi = ${px2} px`);
            break;
          case "in":
            calcs.push(`① : ${parsed1.value} in × ${dpiValue} dpi = ${px1} px`);
            calcs.push(`② : ${parsed2.value} in × ${dpiValue} dpi = ${px2} px`);
            break;
        }
        
        data = {
          mainResult: `${px1} × ${px2} px`,
          cm: `${conv1.cm} × ${conv2.cm}`,
          mm: `${conv1.mm} × ${conv2.mm}`,
          inches: `${conv1.inches} × ${conv2.inches}`,
          px: `${px1} × ${px2}`,
          dpiValue: dpiValue,
          calculations: calcs,
        };
      } else {
        let calc = "";
        switch (parsed1.unit) {
          case "cm":
            calc = `(${parsed1.value} cm ÷ 2.54) × ${dpiValue} dpi = ${px1} px`;
            break;
          case "mm":
            calc = `(${parsed1.value} mm ÷ 25.4) × ${dpiValue} dpi = ${px1} px`;
            break;
          case "in":
            calc = `${parsed1.value} in × ${dpiValue} dpi = ${px1} px`;
            break;
        }
        
        data = {
          mainResult: `${px1} px`,
          cm: conv1.cm,
          mm: conv1.mm,
          inches: conv1.inches,
          px: `${px1}`,
          dpiValue: dpiValue,
          calculations: [calc],
        };
      }
    }

    setConversionData(data);
    setShowResult(true);
  }

  if (showResult && conversionData) {
    const markdown = `# ✅ ${conversionData.mainResult}

## Detailed Calculations

${conversionData.calculations.map(calc => `- ${calc}`).join('\n')}
`;

    const allValues = `px: ${conversionData.px}\ncm: ${conversionData.cm}\nmm: ${conversionData.mm}\nin: ${conversionData.inches}`;

    return (
      <Detail
        markdown={markdown}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Result" text={conversionData.mainResult} icon="✅" />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Pixels" text={`${conversionData.px} px`} icon={Icon.Hashtag} />
            <Detail.Metadata.Label title="Centimeters" text={`${conversionData.cm} cm`} icon={Icon.Ruler} />
            <Detail.Metadata.Label title="Millimeters" text={`${conversionData.mm} mm`} icon={Icon.Ruler} />
            <Detail.Metadata.Label title="Inches" text={`${conversionData.inches} in`} icon={Icon.Ruler} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Resolution" text={`${conversionData.dpiValue} DPI`} icon={Icon.Eye} />
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            <Action
              title="New Conversion"
              icon={Icon.ArrowLeft}
              onAction={() => setShowResult(false)}
            />
            <Action
              title="Copy Result"
              icon={Icon.Clipboard}
              onAction={async () => {
                await Clipboard.copy(conversionData.mainResult);
                await showToast({ title: "Copied!", style: Toast.Style.Success });
              }}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action
              title="Copy All Values"
              icon={Icon.CopyClipboard}
              onAction={async () => {
                await Clipboard.copy(allValues);
                await showToast({ title: "Copied!", style: Toast.Style.Success });
              }}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Convert" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="dimension1" title="① Dimension" placeholder="e.g.: 512px, 2.5cm, 8.5in" />
      <Form.TextField id="dimension2" title="② Dimension" placeholder="optional" />
      <Form.TextField id="dpi" title="DPI" placeholder="300 (default)" defaultValue="300" />
    </Form>
  );
}
