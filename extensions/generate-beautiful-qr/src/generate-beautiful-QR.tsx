import React, { useEffect, useState } from "react";
import { ActionPanel, Form, Action, showToast, ToastStyle, getPreferenceValues, Clipboard } from "@raycast/api";
import fs from "fs";
import path from "path";
import QRCode from "qrcode";

/**
 * Validates if the provided string is a valid hex color
 * @param {string} hex - The hex color string to validate
 * @returns {boolean} True if valid hex color
 */
function isValidHexColor(hex: string): boolean {
  // Accepts values like "#abc" or "#a1b2c3"
  return /^#(?:[0-9A-Fa-f]{3}){1,2}$/.test(hex.trim());
}

/**
 * Interface for application preferences
 * @interface Preferences
 * @property {string} saveFolder - Directory path for saving QR codes
 */
interface Preferences {
  saveFolder: string;
}

// Get preferences from Preferences
const preferences = getPreferenceValues<Preferences>();

/**
 * Generates a sanitized filename from input text
 * @param {string} inputText - The text to generate filename from
 * @returns {string} Sanitized filename
 */
function generateFileName(inputText: string): string {
  const withoutProtocol = inputText.replace(/^(https?:\/\/)/i, "");
  const sanitized = withoutProtocol.replace(/[<>:"/\\|?*\s]/g, "_");
  return sanitized.length <= 50 ? sanitized : sanitized.substring(0, 30) + sanitized.substring(sanitized.length - 20);
}

/**
 * Generates QR code matrix from input text
 * @param {string} text - Text to encode in QR code
 * @returns {boolean[][]} Matrix representing QR code
 */
function generateMatrix(text: string): boolean[][] {
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const size = qr.modules.size;
  const matrix: boolean[][] = [];
  for (let row = 0; row < size; row++) {
    matrix[row] = [];
    for (let col = 0; col < size; col++) {
      matrix[row][col] = qr.modules.get(row, col);
    }
  }
  return matrix;
}

/**
 * Generates classic style QR code in SVG format
 * @param {string} text - Text to encode
 * @param {string} color - Color for QR code
 * @returns {string} SVG string
 */
function generateClassicQrSvg(text: string, color: string): string {
  const matrix = generateMatrix(text);
  const moduleSize = 30;
  const size = matrix.length * moduleSize;
  const svgParts: string[] = [];
  svgParts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">`);
  svgParts.push(`<rect width="${size}" height="${size}" fill="#FFFFFF"/>`);
  for (let row = 0; row < matrix.length; row++) {
    for (let col = 0; col < matrix[row].length; col++) {
      if (matrix[row][col]) {
        const x = col * moduleSize;
        const y = row * moduleSize;
        svgParts.push(`<rect x="${x}" y="${y}" width="${moduleSize}" height="${moduleSize}" fill="${color}" />`);
      }
    }
  }
  svgParts.push(`</svg>`);
  return svgParts.join("");
}

/**
 * Groups adjacent filled modules using DFS algorithm
 * @param {boolean[][]} matrix - QR code matrix
 * @returns {Array<{cells: Array<{row: number, col: number}>}>} Grouped cells
 */
function mergeContiguousCellsWithCells(matrix: boolean[][]): { cells: { row: number; col: number }[] }[] {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  const groups: { cells: { row: number; col: number }[] }[] = [];
  const directions = [
    { dr: -1, dc: 0 },
    { dr: 1, dc: 0 },
    { dr: 0, dc: -1 },
    { dr: 0, dc: 1 },
  ];

  function dfs(startRow: number, startCol: number, groupCells: { row: number; col: number }[]) {
    const stack = [{ row: startRow, col: startCol }];
    visited[startRow][startCol] = true;
    while (stack.length) {
      const { row, col } = stack.pop()!;
      groupCells.push({ row, col });
      for (const { dr, dc } of directions) {
        const newRow = row + dr;
        const newCol = col + dc;
        if (
          newRow >= 0 &&
          newRow < rows &&
          newCol >= 0 &&
          newCol < cols &&
          matrix[newRow][newCol] &&
          !visited[newRow][newCol]
        ) {
          visited[newRow][newCol] = true;
          stack.push({ row: newRow, col: newCol });
        }
      }
    }
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (matrix[row][col] && !visited[row][col]) {
        const groupCells: { row: number; col: number }[] = [];
        dfs(row, col, groupCells);
        groups.push({ cells: groupCells });
      }
    }
  }
  return groups;
}

/**
 * Generates contour points for a group of modules
 * @param {Array<{row: number, col: number}>} groupCells - Group of cells
 * @param {number} moduleSize - Size of each module
 * @returns {Array<{x: number, y: number}>} Contour points
 */
function generatePathPointsForGroup(
  groupCells: { row: number; col: number }[],
  moduleSize: number,
): { x: number; y: number }[] {
  const cellSet = new Set(groupCells.map((cell) => `${cell.row},${cell.col}`));
  type Point = { x: number; y: number };
  type Segment = { start: Point; end: Point };
  const segments: Segment[] = [];
  groupCells.forEach(({ row, col }) => {
    const x = col * moduleSize;
    const y = row * moduleSize;
    if (!cellSet.has(`${row - 1},${col}`)) {
      segments.push({ start: { x, y }, end: { x: x + moduleSize, y } });
    }
    if (!cellSet.has(`${row},${col + 1}`)) {
      segments.push({ start: { x: x + moduleSize, y }, end: { x: x + moduleSize, y: y + moduleSize } });
    }
    if (!cellSet.has(`${row + 1},${col}`)) {
      segments.push({ start: { x: x + moduleSize, y: y + moduleSize }, end: { x, y: y + moduleSize } });
    }
    if (!cellSet.has(`${row},${col - 1}`)) {
      segments.push({ start: { x, y: y + moduleSize }, end: { x, y } });
    }
  });
  const segmentMap = new Map<string, Segment[]>();
  segments.forEach((seg) => {
    const key = `${seg.start.x},${seg.start.y}`;
    if (!segmentMap.has(key)) {
      segmentMap.set(key, []);
    }
    segmentMap.get(key)!.push(seg);
  });
  if (segments.length === 0) return [];
  const currentSegment = segments[0];
  const pathPoints: { x: number; y: number }[] = [currentSegment.start, currentSegment.end];
  const used = new Set<Segment>();
  used.add(currentSegment);
  let currentPoint = currentSegment.end;
  let iterations = 0;
  while (iterations < segments.length) {
    const key = `${currentPoint.x},${currentPoint.y}`;
    const candidates = segmentMap.get(key) || [];
    let found = false;
    for (const seg of candidates) {
      if (!used.has(seg)) {
        used.add(seg);
        let nextPoint;
        if (seg.start.x === currentPoint.x && seg.start.y === currentPoint.y) {
          nextPoint = seg.end;
        } else {
          nextPoint = seg.start;
        }
        pathPoints.push(nextPoint);
        currentPoint = nextPoint;
        found = true;
        break;
      }
    }
    if (!found) break;
    iterations++;
  }
  return pathPoints;
}

/**
 * Creates smooth contours for blob effect
 * @param {Array<{x: number, y: number}>} points - Points to smooth
 * @param {number} smoothingRadius - Radius for smoothing
 * @returns {string} SVG path string
 */
function roundPolygon(points: { x: number; y: number }[], smoothingRadius: number): string {
  const len = points.length;
  if (len < 3) return "";
  let d = "";
  const minOffset = 1;
  const epsilon = 0.0001;
  for (let i = 0; i < len; i++) {
    const prev = points[(i - 1 + len) % len];
    const curr = points[i];
    const next = points[(i + 1) % len];
    const v1 = { x: curr.x - prev.x, y: curr.y - prev.y };
    const v2 = { x: next.x - curr.x, y: next.y - curr.y };
    const lenV1 = Math.hypot(v1.x, v1.y);
    const lenV2 = Math.hypot(v2.x, v2.y);
    const r1 = lenV1 > epsilon ? Math.max(minOffset, Math.min(smoothingRadius, lenV1 / 2)) : smoothingRadius;
    const r2 = lenV2 > epsilon ? Math.max(minOffset, Math.min(smoothingRadius, lenV2 / 2)) : smoothingRadius;
    const p1 =
      lenV1 > epsilon ? { x: curr.x - (v1.x / lenV1) * r1, y: curr.y - (v1.y / lenV1) * r1 } : { x: curr.x, y: curr.y };
    const p2 =
      lenV2 > epsilon ? { x: curr.x + (v2.x / lenV2) * r2, y: curr.y + (v2.y / lenV2) * r2 } : { x: curr.x, y: curr.y };
    if (i === 0) {
      d += `M${p1.x},${p1.y} `;
    }
    d += `L${p1.x},${p1.y} `;
    d += `Q${curr.x},${curr.y} ${p2.x},${p2.y} `;
  }
  d += "Z";
  return d;
}

/**
 * Identifies and generates paths for inner white spaces
 * @param {Array<{row: number, col: number}>} groupCells - Group of cells
 * @param {boolean[][]} matrix - QR code matrix
 * @param {number} moduleSize - Size of each module
 * @returns {string[]} Array of SVG path strings
 */
function getHolesForGroup(
  groupCells: { row: number; col: number }[],
  matrix: boolean[][],
  moduleSize: number,
): string[] {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const groupSet = new Set(groupCells.map((cell) => `${cell.row},${cell.col}`));
  let minRow = Infinity,
    maxRow = -Infinity,
    minCol = Infinity,
    maxCol = -Infinity;
  groupCells.forEach((cell) => {
    if (cell.row < minRow) minRow = cell.row;
    if (cell.row > maxRow) maxRow = cell.row;
    if (cell.col < minCol) minCol = cell.col;
    if (cell.col > maxCol) maxCol = cell.col;
  });
  // Expand bounding box by 1 module
  minRow = Math.max(minRow - 1, 0);
  minCol = Math.max(minCol - 1, 0);
  maxRow = Math.min(maxRow + 1, rows - 1);
  maxCol = Math.min(maxCol + 1, cols - 1);

  const visited = new Set<string>();
  const holesPaths: string[] = [];
  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      const key = `${r},${c}`;
      if (!matrix[r][c] && !groupSet.has(key) && !visited.has(key)) {
        const stack = [{ row: r, col: c }];
        const whiteGroup: { row: number; col: number }[] = [];
        let touchesBoundary = false;
        while (stack.length) {
          const cell = stack.pop()!;
          const cellKey = `${cell.row},${cell.col}`;
          if (visited.has(cellKey)) continue;
          visited.add(cellKey);
          whiteGroup.push(cell);
          if (cell.row === minRow || cell.row === maxRow || cell.col === minCol || cell.col === maxCol) {
            touchesBoundary = true;
          }
          const neighbors = [
            { dr: -1, dc: 0 },
            { dr: 1, dc: 0 },
            { dr: 0, dc: -1 },
            { dr: 0, dc: 1 },
          ];
          for (const { dr, dc } of neighbors) {
            const nr = cell.row + dr;
            const nc = cell.col + dc;
            const neighborKey = `${nr},${nc}`;
            if (nr >= minRow && nr <= maxRow && nc >= minCol && nc <= maxCol) {
              if (!matrix[nr][nc] && !visited.has(neighborKey)) {
                stack.push({ row: nr, col: nc });
              }
            }
          }
        }
        if (!touchesBoundary) {
          const whitePoints = generatePathPointsForGroup(whiteGroup, moduleSize);
          const smoothingRadius = moduleSize * 0.3;
          const holePath = roundPolygon(whitePoints, smoothingRadius);
          if (holePath) {
            holesPaths.push(holePath);
          }
        }
      }
    }
  }
  return holesPaths;
}

/**
 * Generates finder patterns (corner squares) for QR code
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} moduleSize - Size of each module
 * @param {number} finderSize - Size of finder pattern
 * @param {string} color - Color of pattern
 * @returns {string} SVG elements string
 */
function drawFinderPattern(x: number, y: number, moduleSize: number, finderSize: number, color: string): string {
  const outerSize = finderSize * moduleSize;
  const outerRx = moduleSize * 0.2;
  const innerMargin = moduleSize;
  const innerSize = outerSize - 2 * innerMargin;
  const centerMargin = moduleSize;
  const centerSize = innerSize - 2 * centerMargin;
  const outer = `<rect x="${x}" y="${y}" width="${outerSize}" height="${outerSize}" rx="${outerRx}" ry="${outerRx}" fill="${color}" />`;
  const white = `<rect x="${x + innerMargin}" y="${y + innerMargin}" width="${innerSize}" height="${innerSize}" rx="${outerRx}" ry="${outerRx}" fill="#FFFFFF" />`;
  const center = `<rect x="${x + innerMargin + centerMargin}" y="${y + innerMargin + centerMargin}" width="${centerSize}" height="${centerSize}" rx="${outerRx}" ry="${outerRx}" fill="${color}" />`;
  return outer + white + center;
}

/**
 * Generates blob style QR code in SVG format
 * @param {string} text - Text to encode
 * @param {string} color - Color for QR code
 * @returns {string} SVG string
 */
function generateMergedQrSvg(text: string, color: string): string {
  const matrix = generateMatrix(text);
  const groups = mergeContiguousCellsWithCells(matrix);
  const moduleSize = 30;
  const size = matrix.length * moduleSize;
  const svgParts: string[] = [];
  svgParts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">`);
  svgParts.push(`<rect width="${size}" height="${size}" fill="#FFFFFF"/>`);

  groups.forEach((group) => {
    // Get outer contour for the group (smoothed)
    const rawPoints = generatePathPointsForGroup(group.cells, moduleSize);
    const smoothingRadius = moduleSize * 0.3;
    const outerPath = roundPolygon(rawPoints, smoothingRadius);
    // Calculate inner holes for this group
    const holesPaths = getHolesForGroup(group.cells, matrix, moduleSize);
    // Combine outer contour and hole subpaths (without additional stroke)
    const combinedPath = outerPath + " " + holesPaths.join(" ");
    svgParts.push(`<path d="${combinedPath}" fill="${color}" />`);
  });

  // Overlay white modules on top according to the original matrix,
  // to restore areas that should originally be white background.
  const matrixData = generateMatrix(text);
  for (let row = 0; row < matrixData.length; row++) {
    for (let col = 0; col < matrixData[row].length; col++) {
      if (!matrixData[row][col]) {
        const x = col * moduleSize;
        const y = row * moduleSize;
        svgParts.push(`<rect x="${x}" y="${y}" width="${moduleSize}" height="${moduleSize}" fill="#FFFFFF" />`);
      }
    }
  }

  // Draw finder patterns (eyes) with the selected color
  const finderSize = 7;
  svgParts.push(drawFinderPattern(0, 0, moduleSize, finderSize, color));
  svgParts.push(drawFinderPattern(size - finderSize * moduleSize, 0, moduleSize, finderSize, color));
  svgParts.push(drawFinderPattern(0, size - finderSize * moduleSize, moduleSize, finderSize, color));

  svgParts.push(`</svg>`);
  return svgParts.join("");
}

/**
 * Creates and saves QR code file
 * @param {string} text - Text to encode
 * @param {("classic"|"blob")} qrType - Type of QR code
 * @param {string} color - Color for QR code
 * @returns {Promise<string>} Path to saved file
 */
async function generateQrFile(text: string, qrType: "classic" | "blob", color: string): Promise<string> {
  try {
    const svg = qrType === "classic" ? generateClassicQrSvg(text, color) : generateMergedQrSvg(text, color);
    const baseName = generateFileName(text);
    const fileName = qrType === "classic" ? `👵qr_${baseName}.svg` : `🦆qr_${baseName}.svg`;

    // If preferences.saveFolder is not defined, use default value
    const folder = preferences.saveFolder || (process.env.HOME || process.env.USERPROFILE || "") + "/Downloads";
    const filePath = path.join(folder, fileName);

    fs.writeFileSync(filePath, svg, "utf-8");
    await showToast(ToastStyle.Success, "Copy to Clipboard", "QR code has been copied to clipboard");
    return filePath;
  } catch (error: unknown) {
    console.error("Error creating QR code:", error);
    throw new Error("Failed to create QR code.");
  }
}

/**
 * Main React component for Raycast extension
 * Provides UI for QR code generation with various customization options
 * @returns {JSX.Element} Form component
 */
export default function Command() {
  const [input, setInput] = useState("");
  const [qrType, setQrType] = useState<"classic" | "blob">("blob");

  /**
   * Predefined color options for QR code
   * @type {Object.<PresetOption, string>}
   */
  type PresetOption = "MidnightBlue" | "JustBlack" | "DeepPurple" | "Emerald" | "VibrantOrange" | "Turquoise";
  const presetOptions: { [key in PresetOption]: string } = {
    MidnightBlue: "#2c3e50",
    JustBlack: "#000000",
    DeepPurple: "#8e44ad",
    Emerald: "#2ecc71",
    VibrantOrange: "#e67e22",
    Turquoise: "#1abc9c",
  };

  // Field for custom color (custom)
  const [customColor, setCustomColor] = useState("");
  // Dropdown list with preset colors
  const [presetOption, setPresetOption] = useState<PresetOption>("MidnightBlue");

  // Effective color: if customColor is not empty, it takes priority
  const effectiveColor = customColor.trim() !== "" ? customColor.trim() : presetOptions[presetOption];

  // Added useEffect for automatic text insertion from clipboard
  useEffect(() => {
    async function loadClipboardText() {
      const text = await Clipboard.readText();
      if (text && text.length <= 500) {
        setInput(text);
      }
    }
    loadClipboardText();
  }, []);

  const handleSubmit = async () => {
    if (!input) {
      await showToast(ToastStyle.Failure, "Error", "Input field cannot be empty.");
      return;
    }

    // If user entered value customColor, check its validity
    if (customColor.trim() !== "" && !isValidHexColor(customColor)) {
      await showToast(ToastStyle.Failure, "Error", "Please enter a valid hex color (e.g., #1abc9c).");
      return;
    }

    try {
      const filePath = await generateQrFile(input, qrType, effectiveColor);
      await showToast(ToastStyle.Success, "Saved to:", filePath);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      await showToast(ToastStyle.Failure, "Error", errorMessage);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Generate Qr Code" onAction={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="input"
        title="Text or URL"
        placeholder="Enter text or URL"
        value={input}
        onChange={setInput}
      />
      <Form.Dropdown title="Shape" id="qrType" value={qrType} onChange={(val) => setQrType(val as "classic" | "blob")}>
        <Form.Dropdown.Item value="classic" title="👵 Classic Square" />
        <Form.Dropdown.Item value="blob" title="🦆 Blob and Rounded" />
      </Form.Dropdown>
      <Form.Dropdown
        title="Color"
        id="presetColor"
        value={presetOption}
        onChange={(val) => setPresetOption(val as PresetOption)}
      >
        <Form.Dropdown.Item value="MidnightBlue" title="🌑 Midnight Blue" />
        <Form.Dropdown.Item value="JustBlack" title="🐦‍⬛ Just Black" />
        <Form.Dropdown.Item value="DeepPurple" title="💜 Deep Purple" />
        <Form.Dropdown.Item value="Emerald" title="🌿 Emerald" />
        <Form.Dropdown.Item value="VibrantOrange" title="🍊 Vibrant Orange" />
        <Form.Dropdown.Item value="Turquoise" title="🦚 Turquoise" />
      </Form.Dropdown>
      <Form.TextField
        id="customColor"
        title="Custom Color (hex)"
        info="If set, takes priority"
        placeholder="#1abc9c"
        value={customColor}
        onChange={setCustomColor}
      />
    </Form>
  );
}
