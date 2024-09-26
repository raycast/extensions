import { useEffect, useState } from "react";
import { showToast, Toast, Clipboard, Detail, environment, getPreferenceValues } from "@raycast/api";
import Graphemer from "graphemer";

// // Define types for the preferences
interface Preferences {
  fontStyle: string;
  colorCode: boolean;
}

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

export default function ClipboardViewer() {
  const [clipboardText, setClipboardText] = useState<string | null>(null);
  const [svgDataUri, setSvgDataUri] = useState<string | null>(null);

  // Fetch the user preferences for font style
  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    async function fetchClipboardContent() {
      try {
        const content = await Clipboard.readText();
        setClipboardText(content ?? "No text in clipboard");
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Error reading clipboard",
          message: String(error),
        });
      }
    }
    fetchClipboardContent();
  }, []);

  useEffect(() => {
    if (clipboardText) {
      const svgContent = generateSVG(clipboardText);
      const base64Svg = svgToBase64(svgContent);
      const dataUri = `data:image/svg+xml;base64,${base64Svg}`;
      setSvgDataUri(dataUri);
    }
  }, [clipboardText]);

  // Function to generate an SVG representing the clipboard content
  function generateSVG(text: string): string {
    const splitter = new Graphemer(); // register Graphemer
    const characters = splitter.splitGraphemes(text); // split text into array

    const chunkSize = 10; // Set line length to 10 characters
    const charactersChunks = splitTextIntoChunks(characters, chunkSize); // Split into chunks of 10 characters
    const totalLines = charactersChunks.length;

    // Create indices for each character
    const indicesChunks = charactersChunks.map((chunk, line) =>
      Array.from({ length: chunk.length }, (_, i) => (i + 1 + line * chunkSize).toString().padStart(2, "0")),
    );

    const cellWidth = 80;
    const cellHeight = 80;
    const svgWidth = totalLines > 1 ? chunkSize * cellWidth : cellWidth * characters.length;
    const svgHeight = totalLines * cellHeight * 1.5; // Two rows: one for characters and one for indices

    const darkMode = environment.theme === "dark";
    const colorful = preferences.colorCode;

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
        : "ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'";

    // SVG with a viewBox attribute for scaling
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}"  width="${svgWidth}px" height="${svgHeight}px"> `;

    // Loop over each line (chunk) of characters
    charactersChunks.forEach((chunk, line) => {
      splitter.splitGraphemes(chunk).forEach((char, i) => {
        const encodedChar = encodeForSVG(char);
        const x = i * cellWidth + cellWidth / 2;
        const yCharacter = (line * 1.5 + 1) * cellHeight;
        const yIndex = line * (cellHeight * 1.5) + 110;
        const yBackground = line * 1.5 * cellHeight;
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
          svg += `<rect width="${cellWidth}" height="${cellHeight * 1.48}" x="${i * cellWidth}" y="${yBackground}" fill="${bgColor}" style="opacity:${opacity}"/>`;
        }

        // Add clipboard characters to the first row of each chunk
        svg += `<text x="${x}" y="${yCharacter}" font-family="${fontFamily}" fill="${charColor}" font-size="${cellWidth / 1.5}" text-anchor="middle" alignment-baseline="middle">${encodedChar}</text>`;

        // Add indices to the second row of each chunk
        svg += `<text x="${x}" y="${yIndex}" font-family="${fontFamily}" fill="${textColor}" font-size="${cellWidth / 5}" text-anchor="middle" alignment-baseline="middle" style="opacity:0.5">${indicesChunks[line][i]}</text>`;
      });
    });

    svg += `</svg>`;

    return svg;
  }

  return <Detail markdown={svgDataUri ? `![Clipboard Content](${svgDataUri})` : " "} />;
}
