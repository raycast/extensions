// Script suggestion system based on clipboard content analysis
// Analyzes text patterns and suggests the most relevant Boop scripts

interface SuggestionRule {
  pattern: RegExp | ((text: string) => boolean);
  scripts: string[];
  confidence: number;
  description: string;
}

// Define patterns and their corresponding script suggestions
const suggestionRules: SuggestionRule[] = [
  // JSON Detection
  {
    pattern: /^\s*[{[]/,
    scripts: ["formatJSON", "minifyJSON", "jsonToYaml", "jsonToCSV", "jsonToQuery", "sortJSON"],
    confidence: 0.9,
    description: "JSON detected",
  },

  // Base64 Detection
  {
    pattern: /^[A-Za-z0-9+/]+=*$/,
    scripts: ["base64Decode", "jwtDecode"],
    confidence: 0.8,
    description: "Base64 encoded data detected",
  },

  // URL Detection
  {
    pattern: /https?:\/\/[^\s]+/,
    scripts: ["urlDecode", "urlEncode", "urlDefang"],
    confidence: 0.8,
    description: "URL detected",
  },

  // HTML Detection
  {
    pattern: /<[^>]+>/,
    scripts: ["htmlDecode", "htmlEncode", "formatXML"],
    confidence: 0.8,
    description: "HTML/XML detected",
  },

  // CSV Detection
  {
    pattern: (text: string) => {
      const lines = text.split("\n").filter((line) => line.trim());
      if (lines.length < 2) return false;
      const commaCount = lines[0].split(",").length;
      return commaCount > 1 && lines.every((line) => Math.abs(line.split(",").length - commaCount) <= 1);
    },
    scripts: ["csvToJson", "csvToJsonHeaderless"],
    confidence: 0.8,
    description: "CSV data detected",
  },

  // Hex Color Detection
  {
    pattern: /#[0-9A-Fa-f]{6}/,
    scripts: ["hex2rgb", "contrastingColor"],
    confidence: 0.9,
    description: "Hex color detected",
  },

  // RGB Color Detection
  {
    pattern: /rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/,
    scripts: ["rgb2hex", "contrastingColor"],
    confidence: 0.9,
    description: "RGB color detected",
  },

  // RGB Values (comma-separated)
  {
    pattern: /^\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*$/,
    scripts: ["rgb2hex", "contrastingColor"],
    confidence: 0.8,
    description: "RGB values detected",
  },

  // Binary Numbers
  {
    pattern: /^[01]+$/,
    scripts: ["binaryToDecimal"],
    confidence: 0.7,
    description: "Binary number detected",
  },

  // Hex Numbers
  {
    pattern: /^[0-9A-Fa-f]+$/,
    scripts: ["hexToDecimal", "hexToASCII"],
    confidence: 0.6,
    description: "Hexadecimal detected",
  },

  // Timestamps
  {
    pattern: /^\d{10}$|^\d{13}$/,
    scripts: ["dateToTimestamp", "dateToUTC"],
    confidence: 0.8,
    description: "Unix timestamp detected",
  },

  // SQL Detection
  {
    pattern: /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/i,
    scripts: ["formatSQL", "minifySQL"],
    confidence: 0.8,
    description: "SQL query detected",
  },

  // CSS Detection
  {
    pattern: /[{;}]\s*[a-zA-Z-]+\s*:\s*[^;]+/,
    scripts: ["formatCSS", "minifyCSS"],
    confidence: 0.8,
    description: "CSS detected",
  },

  // YAML Detection
  {
    pattern: /^[a-zA-Z_][a-zA-Z0-9_]*:\s*$/m,
    scripts: ["yamlToJson"],
    confidence: 0.7,
    description: "YAML detected",
  },

  // All Uppercase Text
  {
    pattern: (text: string) => {
      const words = text.trim().split(/\s+/);
      return words.length > 1 && words.every((word) => word === word.toUpperCase() && /[A-Z]/.test(word));
    },
    scripts: ["downcase", "startCase", "camelCase"],
    confidence: 0.6,
    description: "Uppercase text detected",
  },

  // All Lowercase Text
  {
    pattern: (text: string) => {
      const words = text.trim().split(/\s+/);
      return words.length > 1 && words.every((word) => word === word.toLowerCase() && /[a-z]/.test(word));
    },
    scripts: ["upcase", "startCase", "camelCase"],
    confidence: 0.6,
    description: "Lowercase text detected",
  },

  // Query String Detection
  {
    pattern: /[?&][a-zA-Z0-9_]+=.*(&[a-zA-Z0-9_]+=.*)*/,
    scripts: ["queryToJson", "urlDecode"],
    confidence: 0.8,
    description: "Query string detected",
  },

  // JWT Token Detection
  {
    pattern: /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/,
    scripts: ["jwtDecode"],
    confidence: 0.9,
    description: "JWT token detected",
  },

  // Lines that could be sorted/shuffled
  {
    pattern: (text: string) => {
      const lines = text.split("\n").filter((line) => line.trim());
      return lines.length > 3;
    },
    scripts: ["sort", "shuffleLines", "reverseLines", "removeDuplicates"],
    confidence: 0.4,
    description: "Multiple lines detected",
  },

  // Text with extra whitespace
  {
    pattern: /\s{2,}|\n\s*\n/,
    scripts: ["trim", "collapse"],
    confidence: 0.5,
    description: "Extra whitespace detected",
  },

  // Text with smart quotes
  {
    pattern: /[""'']/,
    scripts: ["replaceSmartQuotes"],
    confidence: 0.8,
    description: "Smart quotes detected",
  },
];

interface ScriptSuggestion {
  scriptKey: string;
  confidence: number;
  reasons: string[];
}

export function analyzeClipboardAndSuggestScripts(text: string): ScriptSuggestion[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const suggestions = new Map<string, ScriptSuggestion>();

  // Analyze text against all rules
  for (const rule of suggestionRules) {
    let matches = false;

    if (typeof rule.pattern === "function") {
      matches = rule.pattern(text);
    } else {
      matches = rule.pattern.test(text);
    }

    if (matches) {
      for (const scriptKey of rule.scripts) {
        if (suggestions.has(scriptKey)) {
          const existing = suggestions.get(scriptKey)!;
          existing.confidence = Math.max(existing.confidence, rule.confidence);
          if (!existing.reasons.includes(rule.description)) {
            existing.reasons.push(rule.description);
          }
        } else {
          suggestions.set(scriptKey, {
            scriptKey,
            confidence: rule.confidence,
            reasons: [rule.description],
          });
        }
      }
    }
  }

  // Sort by confidence and return top suggestions
  return Array.from(suggestions.values())
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10); // Limit to top 10 suggestions
}

export function getScriptSuggestionTooltip(suggestion: ScriptSuggestion): string {
  const confidence = Math.round(suggestion.confidence * 100);
  const reasons = suggestion.reasons.join(", ");
  return `${confidence}% confidence - ${reasons}`;
}
