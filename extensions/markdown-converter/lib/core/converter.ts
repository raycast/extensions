import TurndownService from "turndown";
import { DOMParserAdapter } from "./adapters/index.js";
import { mdlog } from "./logging.js";
import { debugConfig } from "./env.js";

/**
 * How to handle images during HTML to Markdown conversion.
 * - 'preserve': Convert all images to Markdown image syntax (default)
 * - 'preserve-external-only': Only preserve images with http/https URLs
 * - 'remove': Remove all images from the output
 */
export type ImageHandlingMode = 'preserve' | 'remove' | 'preserve-external-only';

export type ConversionOptions = {
  domParserAdapter?: DOMParserAdapter;
  /** Controls how images are handled during conversion. Defaults to 'preserve' */
  imageHandling?: ImageHandlingMode;
};

type ConversionContext = {
  parser: DOMParserAdapter;
};

const MONOSPACE_FONT_NAMES = new Set(
  [
    "courier",
    "courier new",
    "consolas",
    "lucida console",
    "menlo",
    "monaco",
    "source code pro",
    "fira code",
    "inconsolata",
    "ubuntu mono",
    "roboto mono",
    "jetbrains mono",
    "pt mono",
    "ibm plex mono",
    "andale mono",
    "monospace",
  ].map((name) => name.toLowerCase()),
);

const BLOCK_TEXT_ELEMENTS = new Set([
  "P",
  "DIV",
  "SECTION",
  "ARTICLE",
  "UL",
  "OL",
  "LI",
  "TABLE",
  "THEAD",
  "TBODY",
  "TFOOT",
  "TR",
  "TH",
  "TD",
  "BLOCKQUOTE",
  "PRE",
]);



function clampHeading(level: number | null | undefined): number | null {
  if (!level || Number.isNaN(level)) {
    return null;
  }
  return Math.min(Math.max(level, 1), 6);
}

function extractHeadingLevelFromString(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }
  const headingMatch = value.match(/heading\s*([1-6])/i) ?? value.match(/heading([1-6])/i);
  if (headingMatch) {
    return clampHeading(parseInt(headingMatch[1] ?? headingMatch[2], 10));
  }
  const outlineMatch = value.match(/outline\s*level\s*([1-6])/i);
  if (outlineMatch) {
    return clampHeading(parseInt(outlineMatch[1], 10));
  }
  return null;
}

function parseFontSize(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }
  const match = value.trim().match(/([0-9]+(?:\.[0-9]+)?)(px|pt|rem|em)?/i);
  if (!match) {
    return null;
  }
  const size = parseFloat(match[1]);
  const unit = (match[2] || "px").toLowerCase();
  if (Number.isNaN(size)) {
    return null;
  }
  switch (unit) {
    case "pt":
      return size * (96 / 72);
    case "rem":
      return size * 16;
    case "em":
      return size * 16;
    default:
      return size;
  }
}

function inferHeadingLevelFromStyle(element: HTMLElement): number | null {
  const style = element.style;
  const fontSize = parseFontSize(style?.fontSize);
  const fontWeight = style?.fontWeight?.toLowerCase();
  const isBold = fontWeight === "bold" || (!!fontWeight && parseInt(fontWeight, 10) >= 600);
  if (!fontSize || !isBold) {
    return null;
  }

  if (fontSize >= 34) {
    return 1;
  }
  if (fontSize >= 28) {
    return 2;
  }
  if (fontSize >= 24) {
    return 3;
  }
  if (fontSize >= 20) {
    return 4;
  }
  if (fontSize >= 18) {
    return 5;
  }
  if (fontSize >= 16) {
    return 6;
  }
  return null;
}

function detectWordHeadingLevel(element: HTMLElement): number | null {
  const role = element.getAttribute("role");
  if (role?.toLowerCase() === "heading") {
    const ariaLevel = element.getAttribute("aria-level") ?? element.dataset.ariaLevel;
    const levelFromAria = clampHeading(parseInt(ariaLevel ?? "", 10));
    if (levelFromAria) {
      return levelFromAria;
    }
  }

  const explicitDataAttr = element.getAttribute("data-ccp-parastyle") ?? element.getAttribute("data-ccp-parastyle-name");
  const levelFromDataAttr = extractHeadingLevelFromString(explicitDataAttr);
  if (levelFromDataAttr) {
    return levelFromDataAttr;
  }

  const datasetValues = Object.values(element.dataset ?? {});
  for (const value of datasetValues) {
    const level = extractHeadingLevelFromString(value);
    if (level) {
      return level;
    }
  }

  const classLevel = extractHeadingLevelFromString(element.className);
  if (classLevel) {
    return classLevel;
  }

  const styleAttr = element.getAttribute("style");
  const msoLevel = extractHeadingLevelFromString(styleAttr);
  if (msoLevel) {
    return msoLevel;
  }

  const inferred = inferHeadingLevelFromStyle(element);
  if (inferred) {
    const text = element.textContent?.trim() ?? "";
    if (text.split(/\s+/).length <= 12) {
      return inferred;
    }
  }

  return null;
}

function normalizeFontTokens(fontFamily: string | null | undefined): string[] {
  if (!fontFamily) {
    return [];
  }
  return fontFamily
    .split(",")
    .map((token) => token.replace(/["']/g, "").trim().toLowerCase())
    .filter(Boolean);
}

function isMonospaceFontFamily(fontFamily: string | null | undefined): boolean {
  const tokens = normalizeFontTokens(fontFamily);
  return tokens.some((token) => MONOSPACE_FONT_NAMES.has(token));
}

function readInlineFontFamily(element: HTMLElement): string | null {
  const inline = element.style?.fontFamily;
  if (inline && inline.trim()) {
    return inline;
  }

  const faceAttr = element.getAttribute("face");
  if (faceAttr && faceAttr.trim()) {
    return faceAttr;
  }

  const styleAttr = element.getAttribute("style");
  if (styleAttr) {
    const match = styleAttr.match(/font-family\s*:\s*([^;]+)/i);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

function promoteWordHeadingsInPlace(doc: Document) {
  const paragraphs = Array.from(doc.body.querySelectorAll("p"));
  for (const paragraph of paragraphs) {
    const level = detectWordHeadingLevel(paragraph);
    if (!level) {
      continue;
    }
    const headingTag = `h${level}` as keyof HTMLElementTagNameMap;
    const heading = doc.createElement(headingTag);
    heading.innerHTML = paragraph.innerHTML;
    if (paragraph.id) {
      heading.id = paragraph.id;
    }
    paragraph.replaceWith(heading);
  }
}

function shouldTransformToCodeBlock(element: HTMLElement): boolean {
  if (!element.textContent || !element.textContent.trim()) {
    return false;
  }

  if (element.closest("pre, code")) {
    return false;
  }

  let encounteredMonospace = isMonospaceFontFamily(readInlineFontFamily(element));
  const ownerDocument = element.ownerDocument;
  const showElements = ownerDocument.defaultView?.NodeFilter?.SHOW_ELEMENT ?? 1;
  const showText = ownerDocument.defaultView?.NodeFilter?.SHOW_TEXT ?? 4;
  const walker = ownerDocument.createTreeWalker(element, showElements);

  while (walker.nextNode()) {
    const current = walker.currentNode as HTMLElement;

    if (current === element) {
      continue;
    }

    if (current.tagName === "PRE" || current.tagName === "CODE") {
      return false;
    }

    const fontFamily = readInlineFontFamily(current);
    if (!fontFamily) {
      continue;
    }

    if (isMonospaceFontFamily(fontFamily)) {
      encounteredMonospace = true;
      continue;
    }

    return false;
  }

  const textWalker = ownerDocument.createTreeWalker(element, showText);

  while (textWalker.nextNode()) {
    const current = textWalker.currentNode as Text;
    const value = current.textContent ?? "";
    if (!value.trim()) {
      continue;
    }

    let parent: HTMLElement | null = current.parentElement;
    let monospaceAncestor = false;

    while (parent) {
      if (parent === element) {
        if (isMonospaceFontFamily(readInlineFontFamily(parent))) {
          monospaceAncestor = true;
        }
        break;
      }

      const fontFamily = readInlineFontFamily(parent);
      if (fontFamily && isMonospaceFontFamily(fontFamily)) {
        monospaceAncestor = true;
        break;
      }

      parent = parent.parentElement;
    }

    if (!monospaceAncestor) {
      return false;
    }
  }

  return encounteredMonospace;
}

function transformMonospaceBlocks(doc: Document) {
  const blocks = Array.from(doc.body.querySelectorAll<HTMLElement>("p, div"));
  for (const block of blocks) {
    if (!shouldTransformToCodeBlock(block)) {
      continue;
    }

    const pre = doc.createElement("pre");
    const code = doc.createElement("code");
    const text = extractMonospaceBlockText(block);
    code.textContent = text;
    pre.appendChild(code);

    if (block.id) {
      pre.id = block.id;
    }

    block.replaceWith(pre);
  }
}

function extractMonospaceBlockText(element: HTMLElement): string {
  const parts: string[] = [];
  const ownerDocument = element.ownerDocument;
  const nodeCtor = ownerDocument.defaultView?.Node;
  const TEXT_NODE = nodeCtor?.TEXT_NODE ?? 3;
  const ELEMENT_NODE = nodeCtor?.ELEMENT_NODE ?? 1;

  function appendNewline() {
    if (!parts.length) {
      parts.push("\n");
      return;
    }
    if (!parts[parts.length - 1].endsWith("\n")) {
      parts.push("\n");
    }
  }

  function serialize(node: Node) {
    if (node.nodeType === TEXT_NODE) {
      let text = (node.textContent ?? "").replace(/\u00a0/g, " ");
      text = text.replace(/\r\n?/g, "\n");
      if (parts.length && parts[parts.length - 1].endsWith("\n")) {
        text = text.replace(/^\n+/, "");
      }
      text = text.replace(/\n+/g, " ");
      if (text) {
        parts.push(text);
      }
      return;
    }

    if (node.nodeType !== ELEMENT_NODE) {
      return;
    }

    const el = node as HTMLElement;
    const tag = el.tagName;

    if (tag === "BR") {
      parts.push("\n");
      return;
    }

    for (const child of Array.from(el.childNodes)) {
      serialize(child);
    }

    if (BLOCK_TEXT_ELEMENTS.has(tag)) {
      appendNewline();
    }
  }

  for (const child of Array.from(element.childNodes)) {
    serialize(child);
  }

  let text = parts.join("");
  text = text.replace(/\r\n?/g, "\n").replace(/\u2028|\u2029/g, "\n");
  text = text.replace(/[ \t]+\n/g, "\n");
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.replace(/^[\n\s]+/, "").replace(/[\n\s]+$/, "");
  return text;
}

function convertMonospaceSpansToCode(doc: Document) {
  const candidates = Array.from(doc.body.querySelectorAll("span, font, tt")) as HTMLElement[];

  for (const element of candidates) {
    if (element.closest("pre, code")) {
      continue;
    }

    if (element.tagName !== "TT") {
      const fontFamily = readInlineFontFamily(element);
      if (!fontFamily || !isMonospaceFontFamily(fontFamily)) {
        continue;
      }
    }

    const textContent = element.textContent ?? "";
    if (!textContent.trim()) {
      continue;
    }

    let shouldSkip = false;
    const descendants = Array.from(element.querySelectorAll("*")) as HTMLElement[];
    for (const descendant of descendants) {
      const tag = descendant.tagName;
      if (tag === "A" || tag === "IMG" || tag === "CODE" || tag === "PRE") {
        shouldSkip = true;
        break;
      }
      if (BLOCK_TEXT_ELEMENTS.has(tag)) {
        shouldSkip = true;
        break;
      }
    }

    if (shouldSkip) {
      continue;
    }

    let inlineText = textContent.replace(/\u00a0/g, " ");
    inlineText = inlineText.replace(/\r\n?/g, "\n");
    inlineText = inlineText.replace(/\s*\n\s*/g, " ");
    inlineText = inlineText.trim();

    if (!inlineText) {
      continue;
    }

    const code = doc.createElement("code");
    code.textContent = inlineText;
    element.replaceWith(code);
  }
}

function isBoldFontWeight(fontWeight: string | null | undefined): boolean {
  if (!fontWeight) {
    return false;
  }
  const normalized = fontWeight.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  if (normalized === "bold" || normalized === "bolder") {
    return true;
  }
  const numeric = parseInt(normalized, 10);
  return !Number.isNaN(numeric) && numeric >= 600;
}

function spanStyleIndicatesBold(span: HTMLSpanElement): boolean {
  if (isBoldFontWeight(span.style?.fontWeight)) {
    return true;
  }
  const styleAttr = span.getAttribute("style") ?? "";
  return /font-weight\s*:\s*(bold|[6-9]\d\d)/i.test(styleAttr);
}

function convertBoldSpansToStrong(doc: Document) {
  const spans = Array.from(doc.body.querySelectorAll<HTMLSpanElement>("span"));
  for (const span of spans) {
    if (span.closest("pre, code")) {
      continue;
    }
    const parentTag = span.parentElement?.tagName;
    if (parentTag === "STRONG" || parentTag === "B") {
      continue;
    }
    if (!spanStyleIndicatesBold(span)) {
      continue;
    }

    const strong = doc.createElement("strong");
    strong.innerHTML = span.innerHTML;
    for (const attribute of span.getAttributeNames()) {
      if (attribute.toLowerCase() === "style") {
        continue;
      }
      const value = span.getAttribute(attribute);
      if (value !== null) {
        strong.setAttribute(attribute, value);
      }
    }
    span.replaceWith(strong);
  }
}

function spanStyleIndicatesItalic(span: HTMLSpanElement): boolean {
  const fontStyle = span.style?.fontStyle?.toLowerCase();
  if (fontStyle === "italic" || fontStyle === "oblique") {
    return true;
  }
  const styleAttr = span.getAttribute("style") ?? "";
  return /font-style\s*:\s*(italic|oblique)/i.test(styleAttr);
}

function convertItalicSpansToEm(doc: Document) {
  const spans = Array.from(doc.body.querySelectorAll<HTMLSpanElement>("span"));
  for (const span of spans) {
    if (span.closest("pre, code")) {
      continue;
    }
    const parentTag = span.parentElement?.tagName;
    if (parentTag === "EM" || parentTag === "I") {
      continue;
    }
    if (!spanStyleIndicatesItalic(span)) {
      continue;
    }

    const em = doc.createElement("em");
    em.innerHTML = span.innerHTML;
    for (const attribute of span.getAttributeNames()) {
      if (attribute.toLowerCase() === "style") {
        continue;
      }
      const value = span.getAttribute(attribute);
      if (value !== null) {
        em.setAttribute(attribute, value);
      }
    }
    span.replaceWith(em);
  }
}

function consolidateWordLists(doc: Document) {
  const listContainers = Array.from(doc.body.querySelectorAll<HTMLElement>("div.ListContainerWrapper"));

  if (listContainers.length === 0) {
    return;
  }

  const groups: HTMLElement[][] = [];
  let currentGroup: HTMLElement[] = [];
  let lastListId: string | null = null;
  let lastListType: string | null = null;

  for (const container of listContainers) {
    const list = container.querySelector("ul, ol") as HTMLElement;
    if (!list) {
      continue;
    }

    const listType = list.tagName.toLowerCase();
    const listItem = list.querySelector("li") as HTMLElement;
    const listId = listItem?.getAttribute("data-listid") || "";

    const isSameGroup = listType === lastListType && listId === lastListId && lastListId !== null;

    if (isSameGroup) {
      currentGroup.push(container);
    } else {
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
      }
      currentGroup = [container];
      lastListType = listType;
      lastListId = listId;
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  for (const group of groups) {
    if (group.length <= 1) {
      continue;
    }

    const firstContainer = group[0];
    const firstList = firstContainer.querySelector("ul, ol") as HTMLElement;
    if (!firstList) {
      continue;
    }

    const allItems: HTMLElement[] = [];
    for (const container of group) {
      const list = container.querySelector("ul, ol");
      if (list) {
        const items = Array.from(list.querySelectorAll("li"));
        allItems.push(...items);
      }
    }

    firstList.innerHTML = "";
    for (const item of allItems) {
      firstList.appendChild(item);
    }

    for (let i = 1; i < group.length; i++) {
      group[i].remove();
    }
  }
}

function isLegacyWordListParagraph(element: HTMLElement): boolean {
  if (element.tagName !== "P") {
    return false;
  }
  const styleAttr = element.getAttribute("style") ?? "";
  if (/mso-list/i.test(styleAttr)) {
    return true;
  }
  if (/MsoListParagraph/i.test(element.className)) {
    return true;
  }
  return false;
}

function extractWordListInfo(paragraph: HTMLElement, commentNodeType: number): { type: "ul" | "ol"; contentHtml: string } | null {
  const markerSpan = paragraph.querySelector<HTMLElement>('span[style*="mso-list:Ignore"]');
  let listType: "ul" | "ol" | null = null;

  if (markerSpan) {
    const markerText = markerSpan.textContent ?? "";
    listType = /^\s*\d+[\.\)]/.test(markerText.trim()) ? "ol" : "ul";
  } else {
    listType = detectListTypeFromContent(paragraph.textContent ?? "");
  }

  if (!listType) {
    return null;
  }

  const clone = paragraph.cloneNode(true) as HTMLElement;
  removeNodesByType(clone, commentNodeType);

  if (markerSpan) {
    const ignored = Array.from(clone.querySelectorAll<HTMLElement>('span[style*="mso-list:Ignore"]'));
    for (const span of ignored) {
      span.remove();
    }
  } else {
    removeLeadingListMarkerNodes(clone, listType);
  }

  const officeNodes = Array.from(clone.querySelectorAll<HTMLElement>("o\\:p"));
  for (const officeNode of officeNodes) {
    officeNode.remove();
  }

  trimLeadingWhitespaceNodes(clone);

  const contentHtml = clone.innerHTML.trim();
  if (!contentHtml) {
    return null;
  }

  return { type: listType, contentHtml };
}

function convertLegacyWordParagraphLists(doc: Document) {
  const defaultView = doc.defaultView;
  const commentNodeType = defaultView?.Node?.COMMENT_NODE ?? 8;
  const children = Array.from(doc.body.children);
  let currentList: { element: HTMLUListElement | HTMLOListElement; type: "ul" | "ol" } | null = null;

  for (const child of children) {
    const paragraph = child as HTMLElement;
    if (!isLegacyWordListParagraph(paragraph)) {
      currentList = null;
      continue;
    }

  const info = extractWordListInfo(paragraph, commentNodeType);
    if (!info) {
      currentList = null;
      continue;
    }

    const li = doc.createElement("li");
    li.innerHTML = info.contentHtml;

    if (!currentList || currentList.type !== info.type) {
      const listElement = doc.createElement(info.type);
      currentList = { element: listElement, type: info.type };
      paragraph.replaceWith(listElement);
      listElement.appendChild(li);
    } else {
      currentList.element.appendChild(li);
      paragraph.remove();
    }
  }
}

function replaceOfficeParagraphNodes(doc: Document) {
  const officeNodes = Array.from(doc.body.querySelectorAll<HTMLElement>("o\\:p"));
  for (const node of officeNodes) {
    const content = node.textContent && node.textContent.length > 0 ? node.textContent : "\u00a0";
    const textNode = doc.createTextNode(content);
    node.replaceWith(textNode);
  }
}

const INLINE_TAGS_FOR_NBSP = new Set(["A", "B", "I", "EM", "STRONG", "CODE", "SPAN", "SMALL", "BIG", "SUB", "SUP"]);

function detectListTypeFromContent(text: string): "ul" | "ol" | null {
  const normalized = text.replace(/\u00a0/g, " ").trim();
  if (!normalized) {
    return null;
  }
  if (/^\d+[\.)]/.test(normalized)) {
    return "ol";
  }
  if (/^[•·o\-*]/i.test(normalized)) {
    return "ul";
  }
  return null;
}

function removeNodesByType(root: HTMLElement, nodeType: number) {
  const stack: Node[] = [root];
  while (stack.length > 0) {
    const node = stack.pop()!;
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === nodeType) {
        child.parentNode?.removeChild(child);
        continue;
      }
      stack.push(child);
    }
  }
}

function removeLeadingListMarkerNodes(element: HTMLElement, listType: "ul" | "ol") {
  const document = element.ownerDocument;
  const nodeCtor = document.defaultView?.Node;
  const TEXT_NODE = nodeCtor?.TEXT_NODE ?? 3;
  const ELEMENT_NODE = nodeCtor?.ELEMENT_NODE ?? 1;
  const orderedPattern = /^\s*\d+[\.)](?:\s+|$)/;
  const bulletPattern = /^\s*[•·o\-*](?:\s+|$)/i;
  const pattern = listType === "ol" ? orderedPattern : bulletPattern;

  while (element.firstChild) {
    const child = element.firstChild;

    if (child.nodeType === TEXT_NODE) {
      const original = child.textContent ?? "";
      const normalized = original.replace(/\u00a0/g, " ");

      if (!normalized.trim()) {
        child.parentNode?.removeChild(child);
        continue;
      }

      if (pattern.test(normalized)) {
        const stripped = normalized.replace(pattern, "");
        const trimmed = stripped.replace(/^\s+/, "");
        if (trimmed) {
          child.textContent = trimmed;
        } else {
          child.parentNode?.removeChild(child);
        }
        continue;
      }

      break;
    }

    if (child.nodeType === ELEMENT_NODE) {
      const elementChild = child as HTMLElement;
      if (elementChild.tagName === "BR") {
        elementChild.remove();
        continue;
      }

      if (elementChild.tagName === "SPAN" || elementChild.tagName === "FONT") {
        removeLeadingListMarkerNodes(elementChild, listType);

        const text = (elementChild.textContent ?? "").replace(/\u00a0/g, " ");
        if (!text.trim()) {
          elementChild.remove();
          continue;
        }
        if (pattern.test(text)) {
          elementChild.remove();
          continue;
        }
        break;
      }

      break;
    }

    child.parentNode?.removeChild(child);
  }
}

function trimLeadingWhitespaceNodes(element: HTMLElement) {
  const document = element.ownerDocument;
  const nodeCtor = document.defaultView?.Node;
  const TEXT_NODE = nodeCtor?.TEXT_NODE ?? 3;
  const ELEMENT_NODE = nodeCtor?.ELEMENT_NODE ?? 1;

  while (element.firstChild) {
    const child = element.firstChild;

    if (child.nodeType === TEXT_NODE) {
      const original = child.textContent ?? "";
      const trimmed = original.replace(/^[\s\u00a0]+/, "");
      if (trimmed.length === 0) {
        child.parentNode?.removeChild(child);
        continue;
      }
      if (trimmed.length !== original.length) {
        child.textContent = trimmed;
      }
      break;
    }

    if (child.nodeType === ELEMENT_NODE && (child as HTMLElement).tagName === "BR") {
      child.parentNode?.removeChild(child);
      continue;
    }

    break;
  }
}

function convertInlineBoundarySpacesToNbsp(doc: Document) {
  const showText = doc.defaultView?.NodeFilter?.SHOW_TEXT ?? 4;
  const walker = doc.createTreeWalker(doc.body, showText);
  const nbsp = "\u00a0";
  const nodes: Text[] = [];

  while (walker.nextNode()) {
    nodes.push(walker.currentNode as Text);
  }

  for (const textNode of nodes) {
    let value = textNode.nodeValue ?? "";
    if (!value.includes(" ") && !value.includes("\n")) {
      continue;
    }

    const previousSibling = textNode.previousSibling;
    const nextSibling = textNode.nextSibling;

    if (value.startsWith(" ") && previousSibling && previousSibling.nodeType === 1) {
      const previousElement = previousSibling as HTMLElement;
      if (INLINE_TAGS_FOR_NBSP.has(previousElement.tagName)) {
        value = nbsp + value.slice(1);
      }
    }

    if (value.endsWith(" ") && nextSibling && nextSibling.nodeType === 1) {
      const nextElement = nextSibling as HTMLElement;
      if (INLINE_TAGS_FOR_NBSP.has(nextElement.tagName)) {
        value = value.slice(0, -1) + nbsp;
      }
    }

    textNode.nodeValue = value;
  }
}

function resolveContext(options: ConversionOptions): ConversionContext {
  if (options.domParserAdapter) {
    return { parser: options.domParserAdapter };
  }
  if (typeof DOMParser === "undefined") {
    throw new Error("DOMParser is not available. Provide domParserAdapter in ConversionOptions.");
  }
  // Create a simple adapter wrapper for the global DOMParser
  return { 
    parser: {
      parseFromString: (html: string, type: string) => new DOMParser().parseFromString(html, type as DOMParserSupportedType)
    }
  };
}

function isGoogleDocsHtml(html: string): boolean {
  return html.includes('docs-internal-guid-') || html.includes('id="docs-internal-guid-');
}

function normalizeGoogleDocsHtml(html: string, context: ConversionContext): string {
  try {
    const doc = context.parser.parseFromString(html, "text/html");
    if (!doc?.body) {
      return html;
    }

    // Remove the wrapper <b> tag that Google Docs adds
    const wrapperB = doc.querySelector('b[id*="docs-internal-guid"]') as HTMLElement;
    if (wrapperB && wrapperB.style.fontWeight === 'normal') {
      // Move all children out of the wrapper
      const parent = wrapperB.parentNode;
      if (parent) {
        while (wrapperB.firstChild) {
          parent.insertBefore(wrapperB.firstChild, wrapperB);
        }
        wrapperB.remove();
      }
    }

    // Convert Google Docs inline styles to semantic HTML
    convertGoogleDocsStylesToSemanticHtml(doc);
    
    // Detect and group consecutive monospace paragraphs into code blocks
    groupMonospaceParagraphsIntoCodeBlocks(doc);

    // Remove non-breaking spaces that Google Docs adds
    removeNonBreakingSpaces(doc);

  convertMonospaceSpansToCode(doc);
    
    // Apply some Word normalization techniques that also work for Google Docs
    convertInlineBoundarySpacesToNbsp(doc);
    convertBoldSpansToStrong(doc);
    convertItalicSpansToEm(doc);

    return doc.body.innerHTML;
  } catch (error) {
    return html;
  }
}

function convertGoogleDocsStylesToSemanticHtml(doc: Document): void {
  // Convert spans with font-weight:700 to <strong>, but not if they're inside headings
  const boldSpans = doc.querySelectorAll('span[style*="font-weight:700"]');
  boldSpans.forEach(span => {
    // Skip if this span is inside a heading element
    const isInHeading = span.closest('h1, h2, h3, h4, h5, h6');
    if (!isInHeading) {
      const strong = doc.createElement('strong');
      strong.innerHTML = span.innerHTML;
      span.parentNode?.replaceChild(strong, span);
    } else {
      // For headings, just remove the span and keep the text content
      const textNode = doc.createTextNode(span.textContent || '');
      span.parentNode?.replaceChild(textNode, span);
    }
  });

  // Convert spans with font-style:italic to <em>
  const italicSpans = doc.querySelectorAll('span[style*="font-style:italic"]');
  italicSpans.forEach(span => {
    const em = doc.createElement('em');
    em.innerHTML = span.innerHTML;
    span.parentNode?.replaceChild(em, span);
  });
}

function removeNonBreakingSpaces(doc: Document): void {
  if (!doc.body) {
    return;
  }

  // First, normalize HTML entities
  doc.body.innerHTML = doc.body.innerHTML.replace(/&nbsp;/g, " ");

  const showText = doc.defaultView?.NodeFilter?.SHOW_TEXT ?? 4;
  const walker = doc.createTreeWalker(doc.body, showText);
  const textNodes: Text[] = [];

  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text);
  }

  for (const node of textNodes) {
    const value = node.nodeValue;
    if (!value || !value.includes("\u00a0")) {
      continue;
    }

    const parentElement = node.parentElement ?? (node.parentNode as Element | null);
    if (parentElement?.closest("pre, code")) {
      continue;
    }

    node.nodeValue = value.replace(/\u00a0/g, " ");
  }
}

function groupMonospaceParagraphsIntoCodeBlocks(doc: Document): void {
  // Find consecutive paragraphs with monospace font
  const monospaceParas = Array.from(doc.querySelectorAll('p')).filter(p => {
    const spans = p.querySelectorAll('span');
    return Array.from(spans).some(span => {
      const style = span.getAttribute('style') || '';
      return style.includes('Courier New') || style.includes('monospace');
    });
  });

  // Group consecutive monospace paragraphs
  const groups: HTMLParagraphElement[][] = [];
  let currentGroup: HTMLParagraphElement[] = [];

  monospaceParas.forEach((para, index) => {
    const prevPara = monospaceParas[index - 1];
    const isConsecutive = prevPara && para.previousElementSibling === prevPara;

    if (isConsecutive || currentGroup.length === 0) {
      currentGroup.push(para);
    } else {
      if (currentGroup.length > 0) {
        groups.push([...currentGroup]);
      }
      currentGroup = [para];
    }
  });

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  // Convert groups to code blocks
  groups.forEach(group => {
    if (group.length >= 2) { // Only convert if multiple consecutive paragraphs
      const pre = doc.createElement('pre');
      const code = doc.createElement('code');
      
      const codeContent = group.map(para => {
        // Extract text content, preserving line structure
        return para.textContent?.trim() || '';
      }).join('\n');
      
      code.textContent = codeContent;
      pre.appendChild(code);
      
      // Replace the first paragraph with the code block
      group[0].parentNode?.replaceChild(pre, group[0]);
      
      // Remove the remaining paragraphs
      group.slice(1).forEach(para => para.remove());
    }
  });
}

function normalizeWordHtml(html: string, context: ConversionContext): string {
  try {
    const doc = context.parser.parseFromString(html, "text/html");
    if (!doc?.body) {
      return html;
    }

    consolidateWordLists(doc);
    convertLegacyWordParagraphLists(doc);
    replaceOfficeParagraphNodes(doc);
    convertInlineBoundarySpacesToNbsp(doc);
    promoteWordHeadingsInPlace(doc);
    transformMonospaceBlocks(doc);
    convertMonospaceSpansToCode(doc);
    convertBoldSpansToStrong(doc);
    convertItalicSpansToEm(doc);

    return doc.body.innerHTML;
  } catch (error) {
    return html;
  }
}

function createTurndownService(imageHandling: ImageHandlingMode = 'preserve'): TurndownService {
  const turndownInstance = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    linkStyle: "inlined",
  });

  turndownInstance.keep(["pre", "code"]);

  // Custom rule to handle paragraphs inside list items (Word behavior)
  turndownInstance.addRule("listParagraph", {
    filter: function (node) {
      return !!(node.nodeName === "P" && node.parentNode && node.parentNode.nodeName === "LI");
    },
    replacement: function (content) {
      return content;
    },
  });

  // Custom list processing to fix spacing issues
  turndownInstance.addRule("listItem", {
    filter: "li",
    replacement: function (content, node, options) {
      content = content
        .replace(/^\s+/, "")
        .replace(/\s+$/, "")
        .replace(/\n/gm, "\n    ");

      const bullet = options.bulletListMarker || "*";
      return bullet + " " + content + "\n";
    },
  });

  // Override list rules to process all items at once
  turndownInstance.addRule("list", {
    filter: ["ul", "ol"],
    replacement: function (content, node, options) {
      const element = node as HTMLElement;
      const listItems = Array.from(element.querySelectorAll("li"));
      const isOrdered = element.tagName.toLowerCase() === "ol";

      const processedItems = listItems.map((li, index) => {
        let itemContent = turndownInstance
          .turndown(li.innerHTML)
          .replace(/^\s+/, "")
          .replace(/\s+$/, "")
          .replace(/\n/gm, "\n    ");

        if (isOrdered) {
          return `${index + 1}. ${itemContent}`;
        } else {
          const bullet = options.bulletListMarker || "*";
          return `${bullet} ${itemContent}`;
        }
      });

      return processedItems.join("\n") + "\n";
    },
  });

  // Custom rule to handle links and strip all title attributes for better compatibility
  turndownInstance.addRule("links", {
    filter: "a",
    replacement: function (content, node) {
      const element = node as HTMLAnchorElement;
      const href = element.getAttribute('href') || '';
      
      if (!href) {
        return content;
      }
      
      // Always return links without title attributes for maximum compatibility
      return `[${content}](${href})`;
    },
  });

  // Custom rule to handle images based on configuration
  turndownInstance.addRule("images", {
    filter: "img",
    replacement: function (content, node) {
      const element = node as HTMLImageElement;

      if (imageHandling === 'remove') {
        return '';
      }
      
      // Use getAttribute to get the original src value without JSDOM URL resolution
      const src = element.getAttribute('src') || '';
      const rawAlt = element.getAttribute('alt') || '';
      const alt = rawAlt
        .replace(/[\r\n]+/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
      
      if (!src) {
        return '';
      }
      
      // Handle different image types based on configuration
      if (imageHandling === 'preserve-external-only') {
        // Only preserve images with external URLs (http/https)
        if (!src.match(/^https?:\/\//i)) {
          return '';
        }
      }
      
      // Return standard Markdown image syntax
      return `![${alt}](${src})`;
    },
  });

  return turndownInstance;
}

/**
 * Converts HTML content to Markdown format with platform-specific optimizations.
 * Handles Word, Google Docs, and web content with configurable image processing.
 * 
 * @param html - The HTML string to convert to Markdown
 * @param options - Configuration options for conversion behavior
 * @returns The converted Markdown string, or empty string if input is invalid
 */
export function convertHtmlToMarkdown(html: string, options: ConversionOptions = {}): string {
  // Validate input
  if (!html || typeof html !== 'string') {
    return '';
  }

  const context = resolveContext(options);
  
  // Detect source and apply appropriate normalization
  let normalized: string;
  if (isGoogleDocsHtml(html)) {
    normalized = normalizeGoogleDocsHtml(html, context);
  } else {
    normalized = normalizeWordHtml(html, context);
  }

  // Create TurndownService instance with image handling configuration
  const turndownInstance = createTurndownService(options.imageHandling);
  
  const markdown = turndownInstance.turndown(normalized);
 
  if (debugConfig.inlineDebug && normalized.includes("monospace")) {
    mdlog('debug', 'converter', 'Normalized HTML:', normalized);
    mdlog('debug', 'converter', 'Resulting Markdown:', markdown);
  }
  return markdown.replace(/\u00a0/g, " ").replace(/[ \t]+\n/g, "\n");
}

/**
 * Converts clipboard content to Markdown format with fallback handling.
 * Prioritizes HTML content over plain text when both are available.
 * 
 * @param html - Optional HTML content from clipboard (preferred)
 * @param plain - Optional plain text content from clipboard (fallback)
 * @param options - Configuration options for conversion behavior
 * @returns The converted Markdown string, or empty string if no valid content
 */
export function convertClipboardPayload(html?: string, plain?: string, options: ConversionOptions = {}): string {
  // Ensure html is a string before calling trim()
  if (html && typeof html === 'string' && html.trim()) {
    return convertHtmlToMarkdown(html, options);
  }
  // Ensure plain is a string before calling trim()
  if (plain && typeof plain === 'string') {
    return plain.trim();
  }
  return "";
}
