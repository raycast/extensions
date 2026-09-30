import { useEffect, useState } from "react";
import { Detail, environment, getPreferenceValues } from "@raycast/api";
import Graphemer from "graphemer";

// Define types for the preferences
type Preferences = {
  fontStyle: string;
  colorCode: boolean;
  indexedType: boolean;
};

type DisplayTextProps = {
  inputText: string | null;
};

// Function to convert SVG content to Base64
function svgToBase64(svgContent: string): string {
  return Buffer.from(svgContent).toString("base64");
}

// Function to split text into chunks of 20 characters
function splitTextIntoChunks(characters: string[], chunkSize: number): string[] {
  const chunks = [];
  for (let i = 0; i < characters.length; i += chunkSize) {
    chunks.push(characters.slice(i, i + chunkSize).join(""));
  }
  return chunks;
}

// Check if character is letter, number or symbol
function checkCharacterType(char: string): string {
  if (/[a-zA-Z]/.test(char)) {
    return "letter";
  } else if (/[0-9]/.test(char)) {
    return "number";
  } else {
    return "symbol";
  }
}

// Function to encode special characters for SVG
function encodeForSVG(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Add line breaks if not indexing type
function addLineBreaks(text: string): string {
  const words = text.split(/(\s+)/); // Split by spaces and preserve them
  let currentLine = "";
  let result = "";
  const maxLineLength = 24;

  words.forEach((word) => {
    // If the word contains a line break, reset the current line
    if (word.includes("\n")) {
      // Add the current line, keeping one line per line break (so blank lines are preserved)
      result += currentLine.trim() + "\n".repeat(word.split("\n").length - 1);
      currentLine = ""; // Reset line
    } else if ((currentLine + word).length > maxLineLength) {
      // If the next word would exceed the line length, add the current line to the result
      if (currentLine.trim()) {
        result += currentLine.trim() + "\n";
      }
      currentLine = word; // Start a new line with the current word
    } else {
      // Continue building the current line
      currentLine += word;
    }
  });

  // Add the last line if there's any remaining text
  if (currentLine.trim()) {
    result += currentLine.trim();
  }

  return result;
}

// Estimate the width of a line in ems. SVG can't measure text before it is rendered, so this
// deliberately errs on the wide side: a slightly smaller text is better than text cut off by the viewBox.
function estimateLineWidth(line: string, monospace: boolean): number {
  const splitter = new Graphemer();
  return splitter.splitGraphemes(line).reduce((width, char) => {
    // CJK, emoji and other wide characters
    if (
      /[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60\uFFE0-\uFFE6\u{20000}-\u{2FA1F}\u{30000}-\u{3FFFD}]/u.test(
        char,
      )
    ) {
      return width + 1.1;
    }
    if (/\p{Extended_Pictographic}/u.test(char)) {
      return width + 1.2;
    }
    if (monospace) {
      return width + 0.62;
    }
    if (/[ il.,:;!|'`Ijf]/.test(char)) {
      return width + 0.32;
    }
    if (/[trs()[\]{}"/\\-]/.test(char)) {
      return width + 0.42;
    }
    if (/[mwMW@%]/.test(char)) {
      return width + 0.92;
    }
    if (/[A-Z&#]/.test(char)) {
      return width + 0.72;
    }
    return width + 0.57;
  }, 0);
}

export default function DisplayText({ inputText }: DisplayTextProps) {
  const [svgDataUri, setSvgDataUri] = useState<string | null>(null);

  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    if (inputText) {
      let svgContent = "";
      if (indexed) {
        svgContent = generateIndexedSVG(inputText);
      } else {
        svgContent = generateNonIndexedSVG(inputText);
      }

      setSvgDataUri(svgContent);
    }
  }, [inputText]);

  const darkMode = environment.theme === "dark";
  const colorful = preferences.colorCode;
  const indexed = preferences.indexedType;

  let textColor = "black";
  let bgColor = "white";
  let opacity = "0.5";
  let numColor = "#025DAE";
  let symColor = "#CF2626";

  if (darkMode) {
    textColor = "white";
    bgColor = "black";
    opacity = "0.2";
    numColor = "#56C2FF";
    symColor = "#FF6363";
  }

  // Choose the appropriate font based on user preferences
  const fontFamily =
    preferences.fontStyle === "monospace"
      ? "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace"
      : "ui-sans-serif, system-ui, 'Helvetica Neue', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'";

  // Function to generate an indexed SVG representing the clipboard content
  function generateIndexedSVG(text: string): string {
    const splitter = new Graphemer(); // register Graphemer
    const characters = splitter.splitGraphemes(text); // split text into array

    const chunkSize = 10; // Set line length to 10 characters
    const charactersChunks = splitTextIntoChunks(characters, chunkSize); // Split into chunks of 10 characters
    const totalLines = charactersChunks.length;

    // Create indices for each character
    const indicesChunks = charactersChunks.map((chunk, line) =>
      Array.from({ length: chunk.length }, (_, i) => (i + 1 + line * chunkSize).toString().padStart(2, "0")),
    );

    const cellWidth = 120;
    const cellHeight = 200;
    const svgWidth = totalLines > 1 ? chunkSize * cellWidth : cellWidth * characters.length;
    const svgHeight = totalLines * cellHeight; // Two rows: one for characters and one for indices

    // SVG with a viewBox attribute for scaling
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}"  width="${svgWidth}px" height="${svgHeight}px"> `;

    // Loop over each line (chunk) of characters
    charactersChunks.forEach((chunk, line) => {
      splitter.splitGraphemes(chunk).forEach((char, i) => {
        const encodedChar = encodeForSVG(char);
        const x = i * cellWidth + cellWidth / 2;
        const yCharacter = cellHeight * (line + 1) - cellHeight / 3;
        const yIndex = cellHeight * (line + 1) - 10;
        const yBackground = line * cellHeight;
        const charType = checkCharacterType(char);
        const charColor = !colorful
          ? textColor
          : charType === "symbol"
            ? symColor
            : charType === "number"
              ? numColor
              : textColor;

        // Add alternating background
        if (i % 2) {
          svg += `<rect width="${cellWidth}" height="${cellHeight * 0.99}" x="${i * cellWidth}" y="${yBackground}" fill="${bgColor}" style="opacity:${opacity}"/>`;
        }

        // Add clipboard characters to the first row of each chunk
        svg += `<text x="${x}" y="${yCharacter}" font-family="${fontFamily}" fill="${charColor}" font-size="${cellWidth / 1.5}" text-anchor="middle" alignment-baseline="middle">${encodedChar}</text>`;

        // Add indices to the second row of each chunk
        svg += `<text x="${x}" y="${yIndex}" font-family="${fontFamily}" fill="${textColor}" font-size="${cellWidth / 5}" text-anchor="middle" alignment-baseline="middle" style="opacity:0.5">${indicesChunks[line][i]}</text>`;
      });
    });

    svg += `</svg>`;

    const base64Svg = svgToBase64(svg);
    const dataUri = `data:image/svg+xml;base64,${base64Svg}`;

    return `![Clipboard Content](${dataUri})`;
  }

  // Function to generate a non indexed SVG representing the clipboard content
  function generateNonIndexedSVG(text: string): string {
    const maxLineLength = 24;
    // Only set image height if text is less than 3 lines
    const height = text.length < maxLineLength * 3 ? "350" : "";

    // SVG renderers collapse "\n" into a space, so each line gets its own <tspan>
    const lines = addLineBreaks(text).split("\n");
    const fontSize = 200;
    const lineHeight = fontSize * 1.2;
    const padding = fontSize / 4;
    const monospace = preferences.fontStyle === "monospace";
    const textWidth = lines.reduce((max, line) => Math.max(max, estimateLineWidth(line, monospace)), 0) * fontSize;

    // Grow the viewBox to fit the text, so it is scaled down to fit the window instead of being cut off
    const svgWidth = Math.ceil(Math.max(700, textWidth + padding * 2));
    const svgHeight = Math.ceil(Math.max(350, lines.length * lineHeight + padding * 2));
    const firstLineY = svgHeight / 2 - ((lines.length - 1) * lineHeight) / 2;

    const tspans = lines
      .map((line, i) => `<tspan x="${svgWidth / 2}" y="${firstLineY + i * lineHeight}">${encodeForSVG(line)}</tspan>`)
      .join("");

    // SVG with a viewBox attribute for scaling
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}"  > `;

    svg += `<text
      font-size="${fontSize}"
      fill="${textColor}"
      font-family="${fontFamily}"
      alignment-baseline="middle"
      dominant-baseline="middle"
      text-anchor="middle"
    >${tspans}</text>`;

    svg += `</svg>`;

    // return svg;
    const base64Svg = svgToBase64(svg);

    return `<img width="700" height="${height}" src="data:image/svg+xml;base64,${base64Svg}" />`;
  }
  return <Detail markdown={svgDataUri} />;
}
