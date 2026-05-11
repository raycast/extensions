import { ParsedShaderVariant } from "./types";

// Set to true to enable detailed parsing logs
const DEBUG = false;

interface PassInfo {
  index: number;
  name?: string;
  startLine: number;
}

/**
 * Extract all passes from the shader content with their names and line numbers
 */
function extractPasses(content: string): PassInfo[] {
  const passes: PassInfo[] = [];
  const lines = content.split("\n");
  let passIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Look for " Pass {" pattern
    if (/^\s*Pass\s*\{/.test(line)) {
      const passInfo: PassInfo = {
        index: passIndex,
        startLine: i,
      };

      // Check next few lines for "Name" declaration
      for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        const nextLine = lines[j].trim();
        const nameMatch = nextLine.match(/^Name\s+"([^"]+)"/);
        if (nameMatch) {
          passInfo.name = nameMatch[1];
          break;
        }
        // Stop if we hit the compiled programs section or another Pass
        if (nextLine.includes("Compiled programs") || /^Pass\s*\{/.test(nextLine)) {
          break;
        }
      }

      passes.push(passInfo);
      passIndex++;
    }
  }

  return passes;
}

/**
 * Parse a compiled shader file (Unity shader disassembly format)
 * into individual variants with their vertex and fragment code.
 */
export function parseCompiledShader(content: string): ParsedShaderVariant[] {
  const variants: ParsedShaderVariant[] = [];

  // First, extract all passes with their info
  const passes = extractPasses(content);

  if (DEBUG && passes.length > 0) {
    console.log(
      `[Parser] Found ${passes.length} pass(es):`,
      passes.map((p) => `Pass ${p.index}${p.name ? `: "${p.name}"` : ""}`).join(", "),
    );
  }

  // Split by the separator line (multiple slashes) but keep track of line numbers
  const allLines = content.split("\n");
  let currentBlock = "";
  let blockStartLine = 0;

  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];

    // Check if this is a separator line
    if (/^\/{50,}$/.test(line)) {
      // Process accumulated block
      if (currentBlock.trim()) {
        // Find which pass this block belongs to
        const passInfo = findPassForLine(passes, blockStartLine);
        const variant = parseVariantBlock(currentBlock, blockStartLine, passInfo);
        if (variant && (variant.vertexCode || variant.fragmentCode)) {
          variants.push(variant);
        }
      }
      // Start new block
      currentBlock = "";
      blockStartLine = i + 2; // +1 for next line, +1 for 1-indexed
    } else {
      currentBlock += line + "\n";
    }
  }

  // Process last block
  if (currentBlock.trim()) {
    const passInfo = findPassForLine(passes, blockStartLine);
    const variant = parseVariantBlock(currentBlock, blockStartLine, passInfo);
    if (variant && (variant.vertexCode || variant.fragmentCode)) {
      variants.push(variant);
    }
  }

  if (DEBUG) {
    console.log(`[Parser] Parsed ${content.length} chars → ${variants.length} variant(s)`);
    if (variants.length === 0) {
      // Show what we tried to parse when nothing was found
      const preview = content.substring(0, 500).replace(/\n/g, "\\n");
      console.log(`[Parser] No variants found. First 500 chars: "${preview}"`);
    }
  }
  return variants;
}

/**
 * Find which pass a given line belongs to
 */
function findPassForLine(passes: PassInfo[], lineNumber: number): PassInfo | undefined {
  // Find the last pass that starts before or at this line
  for (let i = passes.length - 1; i >= 0; i--) {
    if (passes[i].startLine <= lineNumber) {
      return passes[i];
    }
  }
  return undefined;
}

function parseVariantBlock(block: string, blockStartLine: number, passInfo?: PassInfo): ParsedShaderVariant | null {
  const lines = block.split("\n");

  // Extract keywords
  let keywords: string[] = [];
  let tier: string | undefined;
  let api: string | undefined;

  for (const line of lines) {
    const trimmed = line.trim();

    // Keywords: <keywords>
    if (trimmed.startsWith("Keywords:")) {
      const keywordsStr = trimmed.replace("Keywords:", "").trim();
      if (keywordsStr && keywordsStr !== "<none>") {
        keywords = keywordsStr.split(/\s+/);
      } else {
        keywords = ["<none>"];
      }
    }

    // -- Hardware tier variant: Tier 1
    if (trimmed.includes("Hardware tier variant:")) {
      const match = trimmed.match(/Tier\s+\d+/i);
      if (match) {
        tier = match[0];
      }
    }

    // -- Vertex shader for "gles3":
    if (trimmed.includes("shader for")) {
      const match = trimmed.match(/shader for ["']([^"']+)["']/i);
      if (match) {
        api = match[1];
      }
    }
  }

  // Extract vertex code with line number
  const vertexResult = extractShaderCodeWithLine(block, "VERTEX", blockStartLine);

  // Extract fragment code with line number
  const fragmentResult = extractShaderCodeWithLine(block, "FRAGMENT", blockStartLine);

  if (!vertexResult && !fragmentResult) {
    return null;
  }

  return {
    id: `variant_${blockStartLine}_${keywords.join("_")}`,
    keywords,
    tier,
    api,
    passIndex: passInfo?.index,
    passName: passInfo?.name,
    vertexCode: vertexResult?.code,
    fragmentCode: fragmentResult?.code,
    vertexLineNumber: vertexResult?.versionLine,
    fragmentLineNumber: fragmentResult?.versionLine,
  };
}

/**
 * Extract shader code between #ifdef SHADER_TYPE and #endif
 * Properly handles nested preprocessor directives (#if/#ifdef/#ifndef/#endif)
 * Returns code and line number of #version in original file
 */
function extractShaderCodeWithLine(
  block: string,
  shaderType: "VERTEX" | "FRAGMENT",
  blockStartLine: number,
): { code: string; versionLine: number } | undefined {
  const ifdefPattern = new RegExp(`^\\s*#ifdef\\s+${shaderType}\\s*$`, "i");
  const endifPattern = /^\s*#endif\s*$/i;
  // Patterns for nested preprocessor directives
  const nestedIfPattern = /^\s*#(if|ifdef|ifndef)\b/i;

  const lines = block.split("\n");
  let inShaderBlock = false;
  let nestingLevel = 0;
  const codeLines: string[] = [];
  let shaderStartLine = 0; // Line where #ifdef SHADER_TYPE appears

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Check if this is the start of our target shader block
    if (!inShaderBlock && ifdefPattern.test(line)) {
      inShaderBlock = true;
      nestingLevel = 1; // Start counting from 1
      shaderStartLine = i; // Remember where shader block starts
      continue;
    }

    if (inShaderBlock) {
      // Check for nested #if/#ifdef/#ifndef
      if (nestedIfPattern.test(trimmedLine)) {
        nestingLevel++;
        codeLines.push(line);
        continue;
      }

      // Check for #endif
      if (endifPattern.test(trimmedLine)) {
        nestingLevel--;

        if (nestingLevel === 0) {
          // This #endif closes our #ifdef SHADER_TYPE
          break;
        } else {
          // This #endif closes a nested block, include it in the code
          codeLines.push(line);
          continue;
        }
      }

      // Regular line inside the shader block
      codeLines.push(line);
    }
  }

  if (codeLines.length === 0) {
    return undefined;
  }

  const code = codeLines.join("\n").trim();

  // Find #version line within extracted code
  let versionLineOffset = 0;
  for (let i = 0; i < codeLines.length; i++) {
    if (codeLines[i].trim().startsWith("#version")) {
      versionLineOffset = i;
      break;
    }
  }

  // Calculate absolute line number in original file
  const versionLine = blockStartLine + shaderStartLine + 1 + versionLineOffset;

  if (DEBUG && code) {
    console.log(`[Parser] ${shaderType}: ${code.length} chars at line ${versionLine}`);
  }

  return { code, versionLine };
}

/**
 * Convert parsed variants into a flat list of items (vertex + fragment separately)
 * for display in List UI.
 */
export function variantsToListItems(variants: ParsedShaderVariant[]): Array<{
  id: string;
  type: "vertex" | "fragment";
  shaderTypeShort: string;
  code: string;
  keywords: string[];
  keywordsDisplay: string;
  tier?: string;
  api?: string;
  passIndex?: number;
  passName?: string;
  lineNumber?: number;
}> {
  const items: Array<{
    id: string;
    type: "vertex" | "fragment";
    shaderTypeShort: string;
    code: string;
    keywords: string[];
    keywordsDisplay: string;
    tier?: string;
    api?: string;
    passIndex?: number;
    passName?: string;
    lineNumber?: number;
  }> = [];

  // Collect unique tiers to decide if we should show tier info
  const uniqueTiers = new Set<string>();
  for (const variant of variants) {
    if (variant.tier) {
      uniqueTiers.add(variant.tier);
    }
  }
  // Only show tier if there are multiple different tiers
  const shouldShowTier = uniqueTiers.size > 1;

  // Collect unique pass indices to decide if we should show pass info
  const uniquePassIndices = new Set<number>();
  for (const variant of variants) {
    if (variant.passIndex !== undefined) {
      uniquePassIndices.add(variant.passIndex);
    }
  }
  // Only show pass if there are multiple passes
  const shouldShowPass = uniquePassIndices.size > 1;

  for (const variant of variants) {
    const keywordsDisplay = variant.keywords.join(" ");

    if (variant.vertexCode) {
      items.push({
        id: `${variant.id}_vertex`,
        type: "vertex",
        shaderTypeShort: "VERT",
        code: variant.vertexCode,
        keywords: variant.keywords,
        keywordsDisplay,
        tier: shouldShowTier ? variant.tier : undefined,
        api: variant.api,
        passIndex: shouldShowPass ? variant.passIndex : undefined,
        passName: shouldShowPass ? variant.passName : undefined,
        lineNumber: variant.vertexLineNumber,
      });
    }

    if (variant.fragmentCode) {
      items.push({
        id: `${variant.id}_fragment`,
        type: "fragment",
        shaderTypeShort: "FRAG",
        code: variant.fragmentCode,
        keywords: variant.keywords,
        keywordsDisplay,
        tier: shouldShowTier ? variant.tier : undefined,
        api: variant.api,
        passIndex: shouldShowPass ? variant.passIndex : undefined,
        passName: shouldShowPass ? variant.passName : undefined,
        lineNumber: variant.fragmentLineNumber,
      });
    }
  }

  return items;
}
