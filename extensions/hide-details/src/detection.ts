// Text classification for platforms without the Swift helper. Mirrors swift/hide-details/Sources/Scan.swift
// and Redaction.swift so both platforms report the same categories for the same OCR lines.

export type Box = { x: number; y: number; width: number; height: number };

export type DetectedKind = "email" | "phone" | "card" | "secret" | "ip" | "name" | "face" | "custom";

export type Detection = {
  kind: DetectedKind;
  text: string;
  confidence: number;
  confidenceSource: "ocr" | "face" | "rule";
  box: Box;
};

export type OcrLine = { text: string; box: Box; custom: boolean };

export type OcrImage = { width: number; height: number; angle: number };

// Windows OCR boxes describe deskewed text. Rotate clockwise around the OCR image's center,
// then scale each axis back to the original image using the actual rounded resize dimensions.
export function ocrBox(box: Box, ocr: OcrImage, image: { width: number; height: number }): Box {
  if (
    ![ocr.width, ocr.height, image.width, image.height].every((value) => Number.isFinite(value) && value > 0) ||
    !Number.isFinite(ocr.angle)
  ) {
    throw new Error("The Windows OCR helper returned invalid image geometry. No image was published.");
  }
  const radians = (ocr.angle * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const centerX = ocr.width / 2;
  const centerY = ocr.height / 2;
  const corners = [
    [box.x, box.y],
    [box.x + box.width, box.y],
    [box.x, box.y + box.height],
    [box.x + box.width, box.y + box.height],
  ].map(([x, y]) => ({
    x: ((centerX + (x - centerX) * cosine - (y - centerY) * sine) * image.width) / ocr.width,
    y: ((centerY + (x - centerX) * sine + (y - centerY) * cosine) * image.height) / ocr.height,
  }));
  const left = Math.min(...corners.map(({ x }) => x));
  const top = Math.min(...corners.map(({ y }) => y));
  const right = Math.max(...corners.map(({ x }) => x));
  const bottom = Math.max(...corners.map(({ y }) => y));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

type Range = { start: number; end: number };

const emailExpression = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const secretSource =
  "(?:sk|rk)[_\\s]+(?:live|test)[_\\s]+(?:[A-Za-z]+[ \\t]+[0-9]{8,19}(?![0-9])|[A-Za-z0-9]+)|ghp[_\\s]+[A-Za-z0-9]{20,}|github[_\\s]+pat[_\\s]+[A-Za-z0-9_]+|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]+|eyJ[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}";

function ranges(source: string, text: string, from = 0, to = text.length): Range[] {
  const expression = new RegExp(source, "g");
  const slice = text.slice(from, to);
  return Array.from(slice.matchAll(expression), (match) => ({
    start: from + match.index,
    end: from + match.index + match[0].length,
  })).filter(({ start, end }) => end > start);
}

const overlaps = (a: Range, b: Range) => a.start < b.end && b.start < a.end;

export function luhn(digits: string): boolean {
  if (!/^[0-9]{13,19}$/.test(digits) || !/[1-9]/.test(digits)) return false;
  let sum = 0;
  for (let index = 0; index < digits.length; index++) {
    let value = Number(digits[digits.length - 1 - index]);
    if (index % 2 === 1) {
      value *= 2;
      if (value > 9) value -= 9;
    }
    sum += value;
  }
  return sum % 10 === 0;
}

export function numericDetections(text: string) {
  const run = "(?<![0-9])[0-9]+(?:[ \\t.-]+[0-9]+)*(?![0-9])";
  const group = "[0-9]+";
  const ipv4Ranges = ranges("(?<![0-9])(?:[0-9]{1,3}[ \\t]*\\.[ \\t]*){3}[0-9]{1,3}(?![0-9])", text).filter((range) =>
    text
      .slice(range.start, range.end)
      .split(".")
      .map((component) => component.trim())
      .every((component) => /^[0-9]+$/.test(component) && Number(component) <= 255),
  );
  const excludedNumericRanges = [...ipv4Ranges, ...ranges(secretSource, text)];
  const cardRanges: Range[] = [];
  for (const match of ranges(run, text)) {
    const groups = ranges(group, text, match.start, match.end);
    for (let start = 0; start < groups.length; start++) {
      let digits = "";
      for (let end = start; end < groups.length; end++) {
        digits += text.slice(groups[end].start, groups[end].end);
        if (digits.length > 19) break;
        const candidate = { start: groups[start].start, end: groups[end].end };
        if (luhn(digits) && !excludedNumericRanges.some((range) => overlaps(range, candidate))) {
          cardRanges.push(candidate);
        }
      }
    }
  }
  const excludedPhoneRanges = [...cardRanges, ...excludedNumericRanges];
  for (const match of ranges(run, text)) {
    const groups = ranges(group, text, match.start, match.end);
    for (let start = 0; start + 3 < groups.length; start++) {
      const window = groups.slice(start, start + 4);
      if (window.every(({ start, end }) => end - start === 4)) {
        excludedPhoneRanges.push({ start: window[0].start, end: window[3].end });
      }
    }
  }
  let hasPhone = false;
  outer: for (const match of ranges("(?<![0-9])\\+?\\(?[0-9]+(?:[ \\t().-]+[0-9]+)*\\)?(?![0-9])", text)) {
    const groups = ranges(group, text, match.start, match.end);
    for (let start = 0; start < groups.length; start++) {
      let digitCount = 0;
      for (let end = start; end < groups.length; end++) {
        digitCount += groups[end].end - groups[end].start;
        if (digitCount > 15) break;
        if (digitCount < 8) continue;
        const candidate = { start: groups[start].start, end: groups[end].end };
        if (!excludedPhoneRanges.some((range) => overlaps(range, candidate))) {
          hasPhone = true;
          break outer;
        }
      }
    }
  }
  return { hasCard: cardRanges.length > 0, hasPhone, hasIP: ipv4Ranges.length > 0 };
}

// Pads a pixel box and clamps it to whole pixels inside the image, matching RedactionRegion in Swift.
export function regionBox(box: Box, padding: number, imageWidth: number, imageHeight: number): Box {
  const left = Math.max(0, Math.floor(box.x - padding));
  const top = Math.max(0, Math.floor(box.y - padding));
  const right = Math.min(imageWidth, Math.ceil(box.x + box.width + padding));
  const bottom = Math.min(imageHeight, Math.ceil(box.y + box.height + padding));
  if (![left, top, right, bottom].every(Number.isFinite) || right <= left || bottom <= top) {
    throw new Error("Redaction region is outside the image. No image was published.");
  }
  return { x: left, y: top, width: right - left, height: bottom - top };
}

export function classify(
  lines: OcrLine[],
  faces: Box[],
  options: { categories: Set<string>; extraWords: string[]; padding: number; width: number; height: number },
): { hits: Detection[]; regions: Box[] } {
  const hits: Detection[] = [];
  function add(kind: DetectedKind, text: string, box: Box, confidenceSource: Detection["confidenceSource"] = "ocr") {
    if (kind !== "custom" && !options.categories.has(kind)) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    hits.push({
      kind,
      text: Array.from(trimmed).slice(0, 80).join(""),
      // Windows OCR and face detection do not report confidence.
      confidence: 1,
      confidenceSource,
      box: regionBox(box, options.padding, options.width, options.height),
    });
  }
  for (const { text, box, custom } of lines) {
    const compact = text.replace(/\s/g, "");
    const lowered = compact.toLocaleLowerCase();
    if (custom) add("custom", text, box);
    if (emailExpression.test(compact)) add("email", text, box);
    if (new RegExp(secretSource).test(text)) add("secret", text, box);
    const numeric = numericDetections(text);
    if (numeric.hasIP) add("ip", text, box);
    if (numeric.hasCard) add("card", text, box);
    if (numeric.hasPhone) add("phone", text, box);
    if (options.extraWords.some((word) => lowered.includes(word.toLocaleLowerCase()))) {
      add("name", text, box, "rule");
    }
  }
  for (const face of faces) add("face", "face", face, "face");
  const seen = new Map<string, Box>();
  for (const { box } of hits) seen.set(`${box.x},${box.y},${box.width},${box.height}`, box);
  return { hits, regions: [...seen.values()] };
}
