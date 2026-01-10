import { ActionPanel, Action, Clipboard, Detail, Form, Icon, showToast, Toast } from "@raycast/api";
import { useState } from "react";

interface ConversionData {
  mainResult: string;
  cm: string;
  mm: string;
  inches: string;
  px: string;
  dpiValue: number;
}

interface ParsedValue {
  value: number;
  unit: string;
  pixels: number;
}

export default function Command() {
  const [conversionData, setConversionData] = useState<ConversionData | null>(null);
  const [showResult, setShowResult] = useState(false);
  
  // États du formulaire
  const [dimension1, setDimension1] = useState("");
  const [dimension2, setDimension2] = useState("");
  const [dpi, setDpi] = useState("300");

  // --- LOGIQUE DE CONVERSION ---

  function toPixels(val: number, unit: string, dpi: number): number {
    switch (unit.toLowerCase()) {
      case "px": return val;
      case "cm": return (val / 2.54) * dpi;
      case "mm": return (val / 25.4) * dpi;
      case "in": return val * dpi;
      default: return 0;
    }
  }

  function fromPixels(px: number, dpi: number) {
    return {
      px: Math.round(px).toString(),
      cm: ((px / dpi) * 2.54).toFixed(2),
      mm: ((px / dpi) * 25.4).toFixed(2),
      inches: (px / dpi).toFixed(2)
    };
  }

  /**
   * Parse une entrée simple "NOMBRE UNITÉ" (ex: "1000px", "20cm")
   */
  function parseInput(input: string, dpi: number): ParsedValue | null {
    if (!input || !input.trim()) return null;
    
    // Nettoyage : remplace virgule par point
    const clean = input.replace(/,/g, ".").trim();

    // Regex stricte : Début ^, Nombre, Espace optionnel, Unité, Fin $
    const match = clean.match(/^(\d+(?:\.\d+)?)\s*(px|cm|mm|in)$/i);

    if (!match) return null;

    const val = parseFloat(match[1]);
    const unit = match[2].toLowerCase();

    // Validation Valeur <= 0
    if (val <= 0) return null;

    return {
      value: val,
      unit: unit,
      pixels: toPixels(val, unit, dpi)
    };
  }

  // --- GESTION DU FORMULAIRE ---

  async function handleSubmit(values: { dimension1: string; dimension2?: string; dpi: string }) {
    // 1. Validation DPI
    const dpiVal = parseFloat(values.dpi.replace(/,/g, "."));
    if (isNaN(dpiVal) || dpiVal <= 0) {
      await showToast({ 
        style: Toast.Style.Failure, 
        title: "Invalid DPI", 
        message: "DPI must be a number greater than 0" 
      });
      return;
    }

    // 2. Parsing Dimension 1
    const d1 = parseInput(values.dimension1, dpiVal);
    
    // Gestion erreurs Dim 1
    if (!d1) {
      const val = parseFloat(values.dimension1.replace(/,/g, "."));
      if (!isNaN(val) && val <= 0) {
        await showToast({ 
          style: Toast.Style.Failure, 
          title: "Invalid Value", 
          message: "Dimension must be greater than 0" 
        });
      } else {
        await showToast({ 
          style: Toast.Style.Failure, 
          title: "Invalid Format", 
          message: "Use format: NUMBER + UNIT (e.g., 1000px, 20cm)" 
        });
      }
      return;
    }

    // 3. Parsing Dimension 2 (Optionnelle)
    let d2: ParsedValue | null = null;
    if (values.dimension2 && values.dimension2.trim().length > 0) {
      d2 = parseInput(values.dimension2, dpiVal);

      if (!d2) {
        const val = parseFloat(values.dimension2.replace(/,/g, "."));
        if (!isNaN(val) && val <= 0) {
          await showToast({ 
            style: Toast.Style.Failure, 
            title: "Invalid Value (Dim 2)", 
            message: "Dimension must be greater than 0" 
          });
        } else {
          await showToast({ 
            style: Toast.Style.Failure, 
            title: "Invalid Format (Dim 2)", 
            message: "Use format: NUMBER + UNIT (e.g., 500px, 10cm)" 
          });
        }
        return;
      }
    }

    // 4. Préparation des résultats
    const res1 = fromPixels(d1.pixels, dpiVal);
    
    let mainResult = "";
    let finalPx = "", finalCm = "", finalMm = "", finalIn = "";

    if (d2) {
      // Mode 2 Dimensions
      const res2 = fromPixels(d2.pixels, dpiVal);
      const targetUnit = d1.unit; 

      if (targetUnit === "px") mainResult = `${res1.px} × ${res2.px} px`;
      else if (targetUnit === "cm") mainResult = `${res1.cm} × ${res2.cm} cm`;
      else if (targetUnit === "mm") mainResult = `${res1.mm} × ${res2.mm} mm`;
      else if (targetUnit === "in") mainResult = `${res1.inches} × ${res2.inches} in`;
      else mainResult = `${res1.px} × ${res2.px} px`;

      finalPx = `${res1.px} × ${res2.px}`;
      finalCm = `${res1.cm} × ${res2.cm}`;
      finalMm = `${res1.mm} × ${res2.mm}`;
      finalIn = `${res1.inches} × ${res2.inches}`;

    } else {
      // Mode 1 Dimension
      if (d1.unit === "px") mainResult = `${res1.cm} cm`;
      else mainResult = `${res1.px} px`;

      finalPx = res1.px;
      finalCm = res1.cm;
      finalMm = res1.mm;
      finalIn = res1.inches;
    }

    setConversionData({
      mainResult,
      px: finalPx,
      cm: finalCm,
      mm: finalMm,
      inches: finalIn,
      dpiValue: dpiVal
    });
    setShowResult(true);
  }

  // --- AFFICHAGE ---

  if (showResult && conversionData) {
    const markdown = `# ✅ ${conversionData.mainResult}

| Unit | Value |
|------|-------|
| **Pixels** | \`${conversionData.px} px\` |
| **CM** | \`${conversionData.cm} cm\` |
| **MM** | \`${conversionData.mm} mm\` |
| **Inches** | \`${conversionData.inches} in\` |

---
*Resolution: ${conversionData.dpiValue} DPI*
`;

    const allValues = `px: ${conversionData.px}\ncm: ${conversionData.cm}\nmm: ${conversionData.mm}\nin: ${conversionData.inches}`;

    return (
      <Detail
        markdown={markdown}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Result" text={conversionData.mainResult} icon="✅" />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Pixels" text={conversionData.px} icon={Icon.Hashtag} />
            <Detail.Metadata.Label title="Centimeters" text={conversionData.cm} icon={Icon.Ruler} />
            <Detail.Metadata.Label title="Millimeters" text={conversionData.mm} icon={Icon.Ruler} />
            <Detail.Metadata.Label title="Inches" text={conversionData.inches} icon={Icon.Ruler} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Resolution" text={`${conversionData.dpiValue} DPI`} icon={Icon.Eye} />
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            <Action title="New Conversion" icon={Icon.ArrowLeft} onAction={() => setShowResult(false)} />
            <Action.CopyToClipboard title="Copy Result" content={conversionData.mainResult} shortcut={{ modifiers: ["cmd"], key: "c" }} />
            <Action.CopyToClipboard title="Copy All Values" content={allValues} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
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
      <Form.TextField 
        id="dimension1" 
        title="① Dimension" 
        placeholder="e.g. 1000px, 20cm" 
        value={dimension1}
        onChange={setDimension1}
      />
      <Form.TextField 
        id="dimension2" 
        title="② Dimension" 
        placeholder="optional (e.g. 500px, 10cm)" 
        value={dimension2}
        onChange={setDimension2}
      />
      <Form.TextField 
        id="dpi" 
        title="DPI" 
        placeholder="300"
        value={dpi} 
        onChange={setDpi} 
      />
    </Form>
  );
}
