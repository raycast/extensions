/**
 * TokenCount Core: Semantic Code Dehydrator
 * 将代码压缩到极致，同时保留 AI 可读性
 */

/**
 * Cursor Rules Generator
 * 从代码中提取规则，生成 .cursorrules 格式
 */

export interface DehydratorResult {
  markdown: string;
  originalLength: number;
  compressedLength: number;
  savedPercent: number;
  variableMap: Map<string, string>;
}

export interface FunctionSignature {
  name: string;
  params: string[];
  returnType: string;
  body: string;
}

/**
 * 核心脱水算法
 * @param code 原始代码
 * @param options 可选配置
 */
export async function dehydrate(
  code: string,
  options: {
    shortFunctionThreshold?: number;
    preserveComments?: boolean;
  } = {}
): Promise<DehydratorResult> {
  const { shortFunctionThreshold = 5 } = options;
  const originalLength = code.length;
  const variableMap = new Map<string, string>();

  let processed = code;

  // 阶段 1: 注释移除
  processed = removeComments(processed);

  // 阶段 2: Log 语句移除
  processed = removeLogs(processed);

  // 阶段 3: 提取函数签名
  const functionSignatures = extractSignatures(processed);
  processed = replaceWithSignatures(processed, functionSignatures, shortFunctionThreshold);

  // 阶段 4: 变量缩短
  processed = shortenVariables(processed, variableMap);

  // 阶段 5: Try-Catch Boilerplate 精简
  processed = condenseTryCatch(processed);

  // 计算压缩结果
  const compressedLength = processed.length;
  const savedPercent = Math.round((1 - compressedLength / originalLength) * 100);

  // 生成 Markdown
  const markdown = generateMarkdown(
    processed,
    savedPercent,
    variableMap,
    functionSignatures
  );

  return {
    markdown,
    originalLength,
    compressedLength,
    savedPercent: Math.max(0, savedPercent),
    variableMap,
  };
}

/**
 * 移除所有注释
 */
function removeComments(code: string): string {
  // 单行注释
  let result = code.replace(/\/\/.*$/gm, "");
  // 多行注释
  result = result.replace(/\/\*[\s\S]*?\*\//g, "");
  return result;
}

/**
 * 移除 Log 语句
 */
function removeLogs(code: string): string {
  return code
    .replace(/\bconsole\.(log|debug|info|warn|error)\s*\([^)]*\)\s*;?/gi, "")
    .replace(/\bconsole\.log\s*\((['"`]).*\1\)\s*;?/gi, "")
    .replace(/logger\.(log|debug|info|warn|error)\s*\([^)]*\)\s*;?/gi, "")
    .replace(/print\s*\([^)]*\)\s*;?/gi, "")
    .replace(/\bconsole\b\.?\w*\s*\(/gi, "");
}

/**
 * 提取所有函数签名
 */
function extractSignatures(code: string): FunctionSignature[] {
  const signatures: FunctionSignature[] = [];

  // TypeScript/JavaScript 函数
  const funcPattern = /(?:(?:async\s+)?(?:function\s+)?|const\s+|let\s+|var\s+)?(\w+)\s*(?:=\s*(?:async\s+)?(?:\([^)]*\)|[^=]))?\s*(?:=>)?\s*\{([\s\S]*?)\n\}/g;

  let match;
  while ((match = funcPattern.exec(code)) !== null) {
    signatures.push({
      name: match[1],
      params: extractParams(match[0]),
      returnType: "",
      body: match[2],
    });
  }

  return signatures;
}

/**
 * 从函数提取参数
 */
function extractParams(funcStr: string): string[] {
  const paramMatch = funcStr.match(/\(([^)]*)\)/);
  if (!paramMatch) return [];
  return paramMatch[1]
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * 用签名替换函数体
 */
function replaceWithSignatures(
  code: string,
  signatures: FunctionSignature[],
  threshold: number
): string {
  let result = code;

  for (const sig of signatures) {
    const bodyLines = sig.body.split("\n").filter((l) => l.trim());
    if (bodyLines.length < threshold) {
      // 短函数保留
      continue;
    }

    // 替换为注释标记
    const signature = `${sig.name}(${sig.params.join(", ")})`;
    result = result.replace(
      sig.body,
      ` // [Logic: ${signature} - Hidden]`
    );
  }

  return result;
}

/**
 * 变量名缩短并生成映射表
 */
function shortenVariables(code: string, variableMap: Map<string, string>): string {
  // 局部变量名映射规则
  const commonPatterns = [
    { pattern: /\brequestData\b/g, short: "rd" },
    { pattern: /\bresponseData\b/g, short: "rsp" },
    { pattern: /\buserData\b/g, short: "ud" },
    { pattern: /\bconfig\b/g, short: "cfg" },
    { pattern: /\bcallback\b/g, short: "cb" },
    { pattern: /\bresult\b/g, short: "res" },
    { pattern: /\berror\b/g, short: "err" },
    { pattern: /\btemp\b/g, short: "tmp" },
    { pattern: /\bdata\b/g, short: "d" },
    { pattern: /\bitem\b/g, short: "i" },
    { pattern: /\bindex\b/g, short: "idx" },
    { pattern: /\bvalue\b/g, short: "v" },
    { pattern: /\boptions\b/g, short: "opts" },
    { pattern: /\bparameters?\b/g, short: "params" },
  ];

  let result = code;
  for (const { pattern, short } of commonPatterns) {
    const original = pattern.source.match(/\b\w+\b/)?.[0];
    if (original && !variableMap.has(original)) {
      variableMap.set(original, short);
    }
    result = result.replace(pattern, short);
  }

  return result;
}

/**
 * 精简 Try-Catch
 */
function condenseTryCatch(code: string): string {
  return code.replace(
    /try\s*\{[\s\S]*?\}\s*catch\s*\([^)]*\)\s*\{[\s\S]*?throw[^}]*;?\}?/gi,
    "// [Error handling hidden]"
  );
}

/**
 * 生成最终 Markdown
 */
function generateMarkdown(
  content: string,
  savedPercent: number,
  variableMap: Map<string, string>,
  signatures: FunctionSignature[]
): string {
  const parts: string[] = [];

  // Wow 效果标题
  parts.push(`⚡ **Optimized by TokenCount** (Saved ${savedPercent}%)\n`);
  parts.push("---\n");

  // 代码内容
  parts.push("```\n" + content.trim() + "\n```\n");

  // 变量映射表（如果有）
  if (variableMap.size > 0) {
    parts.push("\n**Variable Mapping:**\n");
    parts.push("```\n");
    for (const [original, short] of variableMap) {
      parts.push(`  ${original} → ${short}\n`);
    }
    parts.push("```\n");
  }

  // 函数签名表（如果有）
  if (signatures.length > 0) {
    parts.push("\n**Function Signatures:**\n");
    parts.push("```\n");
    for (const sig of signatures) {
      parts.push(`  ${sig.name}(${sig.params.join(", ")})\n`);
    }
    parts.push("```\n");
  }

  return parts.join("");
}

export default dehydrate;