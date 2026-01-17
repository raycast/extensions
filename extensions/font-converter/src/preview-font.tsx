import { Detail, getSelectedFinderItems } from "@raycast/api";
import { useState, useEffect } from "react";
import fs from "fs";
import path from "path";
import { createFont, FontEditor, TTF } from "fonteditor-core";
import fontverter from "fontverter";
import opentype from "opentype.js";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [markdown, setMarkdown] = useState<string>("");
  const [metadata, setMetadata] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAndPreview() {
      try {
        const items = await getSelectedFinderItems();
        if (items.length === 0) {
          setError("No file selected in Finder");
          setIsLoading(false);
          return;
        }

        const filePath = items[0].path;
        const ext = path.extname(filePath).slice(1).toLowerCase();

        if (!["ttf", "woff", "woff2", "eot", "otf"].includes(ext)) {
          setError("Selected file is not a supported font format");
          setIsLoading(false);
          return;
        }

        let buffer = fs.readFileSync(filePath);

        if (ext === "woff2") {
          buffer = await fontverter.convert(buffer, "sfnt");
        }

        const inputType = ext === "woff2" ? "ttf" : ext;
        const font = createFont(buffer, {
          type: inputType as FontEditor.FontType,
          hinting: true,
          kerning: true,
        });

        const fontObj = font.get();
        const nameTable = fontObj.name as TTF.Name;

        const meta = {
          "Font Family": nameTable?.fontFamily || "Unknown",
          "Sub Family": nameTable?.fontSubFamily || "Unknown",
          Version: nameTable?.version || "Unknown",
          Copyright: nameTable?.copyright || "Unknown",
          "Units Per Em": fontObj.head?.unitsPerEm?.toString() || "Unknown",
          Glyphs: fontObj.maxp?.numGlyphs?.toString() || "Unknown",
        };
        setMetadata(meta);

        // opentype.js doesn't support eot, convert to ttf first
        let previewBuffer = buffer;
        if (ext === "eot") {
          const ttfBuffer = font.write({ type: "ttf", hinting: false });
          previewBuffer = Buffer.from(ttfBuffer as Buffer);
        }

        const opentypeFont = opentype.parse(
          previewBuffer.buffer.slice(previewBuffer.byteOffset, previewBuffer.byteOffset + previewBuffer.byteLength),
        );

        const textLines = ["The quick brown fox", "jumps over the lazy dog", "1234567890", "!@#$%^&*()_+"];

        const previewSvg = generateSvgPreview(opentypeFont, textLines);
        const base64Svg = Buffer.from(previewSvg).toString("base64");
        const dataUri = `data:image/svg+xml;base64,${base64Svg}`;

        setMarkdown(`
# ${meta["Font Family"]}

## Preview
![Preview](${dataUri})

## Metadata
| Property | Value |
| --- | --- |
${Object.entries(meta)
  .map(([k, v]) => `| ${k} | ${v} |`)
  .join("\n")}
`);

        setIsLoading(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setIsLoading(false);
      }
    }

    fetchAndPreview();
  }, []);

  if (error) {
    return <Detail markdown={`# Error\n\n${error}`} />;
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          {Object.entries(metadata).map(([key, value]) => (
            <Detail.Metadata.Label key={key} title={key} text={value} />
          ))}
        </Detail.Metadata>
      }
    />
  );
}

function generateSvgPreview(font: opentype.Font, lines: string[]): string {
  const fontSize = 48;
  const lineHeight = fontSize * 1.5;
  const margin = 0;
  const width = 800; // Fixed width for the preview image
  const height = lines.length * lineHeight + margin * 2;

  let paths = "";
  let y = margin + fontSize;

  for (const line of lines) {
    const path = font.getPath(line, margin, y, fontSize);
    paths += path.toSVG(2);
    y += lineHeight;
  }

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <g fill="white">
        ${paths}
    </g>
</svg>
    `.trim();
}
