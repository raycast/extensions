import { useEffect, useState } from "react";
import { showToast, Toast, Clipboard, Detail, environment } from "@raycast/api";

// Function to convert SVG content to Base64
function svgToBase64(svgContent: string): string {
  return Buffer.from(svgContent).toString("base64");
}

// Function to split text into chunks of 20 characters
function splitTextIntoChunks(text: string, chunkSize: number): string[] {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

// Function to encode special characters for SVG
function encodeForSVG(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/ /g, "␣");
}

// TODO:
// ✔︎ escape characters properly
// ✔︎ show spaces as open box ␣
// - add colours for numbers + special characters
// ✔︎ make icon https://ray.so/icon
// - use a font that better distinguishes 0OlI1
// - allow emoji

export default function ClipboardViewer() {
  const [clipboardText, setClipboardText] = useState<string | null>(null);
  const [svgDataUri, setSvgDataUri] = useState<string | null>(null);

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
    const characters = text.split(""); // Split the clipboard content into characters

    const chunkSize = 10; // Set line length to 10 characters
    const charactersChunks = splitTextIntoChunks(text, chunkSize); // Split into chunks of 20 characters
    const totalLines = charactersChunks.length;

    // Create indices for each character
    const indicesChunks = charactersChunks.map((chunk, line) =>
      Array.from({ length: chunk.length }, (_, i) => (i + 1 + line * chunkSize).toString().padStart(2, "0")),
    );

    const cellWidth = 80;
    const cellHeight = 80;
    const svgWidth = totalLines > 1 ? chunkSize * cellWidth : cellWidth * characters.length;
    const svgHeight = totalLines * cellHeight * 1.5; // Two rows: one for characters and one for indices

    const textColor = environment.theme === "dark" ? "white" : "black";
    const bgColor = environment.theme === "dark" ? "black" : "white";
    const opacity = environment.theme === "dark" ? "0.2" : "0.5";

    // SVG with a viewBox attribute for scaling
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" preserveAspectRatio="xMidYMid meet" width="${svgWidth}px"  height="${svgHeight}px"> `;

    // Loop over each line (chunk) of characters
    charactersChunks.forEach((chunk, line) => {
      chunk.split("").forEach((char, i) => {
        const encodedChar = encodeForSVG(char);
        const x = i * cellWidth + cellWidth / 2;
        const yCharacter = (line * 1.5 + 1) * cellHeight;
        const yIndex = line * (cellHeight * 1.5) + 110;
        const yBackground = line * 1.5 * cellHeight;

        // Add alternating background
        if (i % 2) {
          svg += `<rect width="${cellWidth}" height="${cellHeight * 1.48}" x="${i * cellWidth}" y="${yBackground}" fill="${bgColor}" style="opacity:${opacity}"/>`;
        }

        // Add clipboard characters to the first row of each chunk
        svg += `<text x="${x}" y="${yCharacter}" font-family="-apple-system, BlinkMacSystemFont" fill="${textColor}" font-size="${cellWidth / 1.5}" text-anchor="middle" alignment-baseline="middle">${encodedChar}</text>`;

        // Add indices to the second row of each chunk
        svg += `<text x="${x}" y="${yIndex}" font-family="-apple-system, BlinkMacSystemFont" fill="${textColor}" font-size="${cellWidth / 5}" text-anchor="middle" alignment-baseline="middle" style="opacity:0.5">${indicesChunks[line][i]}</text>`;
      });
    });

    svg += `</svg>`;

    return svg;
  }

  return <Detail markdown={svgDataUri ? `![Clipboard Content](${svgDataUri})` : "No text available in clipboard"} />;
}
