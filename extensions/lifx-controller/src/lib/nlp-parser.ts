import { LightProfile } from "./types";

export interface ParsedCommand {
  type: "power" | "color" | "brightness" | "profile" | "scene" | "temperature" | "compound" | "unknown";
  action?: string;
  value?: number;
  color?: { hue: number; saturation: number };
  temperature?: number;
  profileName?: string;
  lightSelector?: "all" | "specific" | "first";
  confidence: number;
  originalText: string;
  subCommands?: ParsedCommand[];
}

// Color mappings for common colors - COMPREHENSIVE!
const COLOR_MAP: Record<string, { hue: number; saturation: number }> = {
  // Basic colors
  red: { hue: 0, saturation: 100 },
  orange: { hue: 30, saturation: 100 },
  yellow: { hue: 60, saturation: 100 },
  lime: { hue: 90, saturation: 100 },
  green: { hue: 120, saturation: 100 },
  cyan: { hue: 180, saturation: 100 },
  blue: { hue: 240, saturation: 100 },
  purple: { hue: 270, saturation: 100 },
  violet: { hue: 270, saturation: 100 },
  magenta: { hue: 300, saturation: 100 },
  pink: { hue: 330, saturation: 100 },
  white: { hue: 0, saturation: 0 },

  // Named colors
  turquoise: { hue: 180, saturation: 80 },
  teal: { hue: 180, saturation: 60 },
  indigo: { hue: 260, saturation: 100 },
  lavender: { hue: 270, saturation: 40 },
  peach: { hue: 20, saturation: 70 },
  coral: { hue: 15, saturation: 80 },
  aqua: { hue: 180, saturation: 100 },
  mint: { hue: 150, saturation: 50 },
  emerald: { hue: 140, saturation: 80 },
  jade: { hue: 160, saturation: 60 },
  chartreuse: { hue: 90, saturation: 100 },
  olive: { hue: 60, saturation: 50 },
  gold: { hue: 50, saturation: 80 },
  amber: { hue: 45, saturation: 100 },
  rose: { hue: 350, saturation: 70 },
  crimson: { hue: 350, saturation: 90 },
  maroon: { hue: 0, saturation: 80 },
  burgundy: { hue: 350, saturation: 80 },
  scarlet: { hue: 10, saturation: 100 },
  ruby: { hue: 350, saturation: 100 },
  salmon: { hue: 10, saturation: 70 },
  tangerine: { hue: 30, saturation: 100 },
  apricot: { hue: 25, saturation: 70 },
  ochre: { hue: 40, saturation: 80 },
  mustard: { hue: 55, saturation: 80 },
  lemon: { hue: 60, saturation: 100 },
  canary: { hue: 55, saturation: 100 },
  forest: { hue: 120, saturation: 70 },
  "forest green": { hue: 120, saturation: 70 },
  seafoam: { hue: 150, saturation: 40 },
  azure: { hue: 210, saturation: 100 },
  cerulean: { hue: 220, saturation: 90 },
  cobalt: { hue: 220, saturation: 100 },
  sapphire: { hue: 230, saturation: 100 },
  navy: { hue: 240, saturation: 100 },
  midnight: { hue: 240, saturation: 100 },
  periwinkle: { hue: 240, saturation: 50 },
  lilac: { hue: 280, saturation: 40 },
  plum: { hue: 280, saturation: 60 },
  orchid: { hue: 285, saturation: 70 },
  fuchsia: { hue: 300, saturation: 100 },

  // Light variations
  "light blue": { hue: 200, saturation: 60 },
  "sky blue": { hue: 200, saturation: 70 },
  "baby blue": { hue: 200, saturation: 50 },
  "powder blue": { hue: 200, saturation: 40 },
  "ice blue": { hue: 200, saturation: 30 },
  "light red": { hue: 0, saturation: 60 },
  "light green": { hue: 120, saturation: 60 },
  "light purple": { hue: 270, saturation: 60 },
  "light pink": { hue: 330, saturation: 50 },
  "light yellow": { hue: 60, saturation: 60 },
  "light orange": { hue: 30, saturation: 70 },
  "pale blue": { hue: 200, saturation: 40 },
  "pale green": { hue: 120, saturation: 40 },
  "pale pink": { hue: 330, saturation: 35 },
  "pale yellow": { hue: 60, saturation: 40 },
  "pastel blue": { hue: 200, saturation: 50 },
  "pastel pink": { hue: 330, saturation: 45 },
  "pastel green": { hue: 120, saturation: 50 },
  "pastel purple": { hue: 270, saturation: 50 },

  // Dark variations
  "deep blue": { hue: 240, saturation: 100 },
  "dark blue": { hue: 240, saturation: 100 },
  "navy blue": { hue: 240, saturation: 100 },
  "dark red": { hue: 0, saturation: 100 },
  "blood red": { hue: 0, saturation: 100 },
  "dark green": { hue: 120, saturation: 100 },
  "dark purple": { hue: 270, saturation: 100 },
  "dark pink": { hue: 330, saturation: 80 },
  "dark orange": { hue: 30, saturation: 100 },
  "deep purple": { hue: 270, saturation: 100 },
  "deep red": { hue: 0, saturation: 100 },
  "deep green": { hue: 120, saturation: 100 },

  // Bright/vivid variations
  "bright blue": { hue: 210, saturation: 100 },
  "bright red": { hue: 0, saturation: 100 },
  "bright green": { hue: 120, saturation: 100 },
  "bright yellow": { hue: 60, saturation: 100 },
  "bright orange": { hue: 30, saturation: 100 },
  "bright pink": { hue: 330, saturation: 100 },
  "bright purple": { hue: 270, saturation: 100 },
  "vivid blue": { hue: 210, saturation: 100 },
  "vivid red": { hue: 0, saturation: 100 },
  "vivid green": { hue: 120, saturation: 100 },
  "hot pink": { hue: 330, saturation: 100 },
  "electric blue": { hue: 210, saturation: 100 },
  "neon pink": { hue: 330, saturation: 100 },
  "neon green": { hue: 120, saturation: 100 },
  "neon blue": { hue: 210, saturation: 100 },

  // Temperature-related colors
  warm: { hue: 30, saturation: 20 },
  cool: { hue: 200, saturation: 20 },
  "warm white": { hue: 30, saturation: 10 },
  "cool white": { hue: 200, saturation: 10 },
  "soft white": { hue: 30, saturation: 5 },
};

// Brightness keywords and their values - COMPREHENSIVE!
const BRIGHTNESS_KEYWORDS: Record<string, number> = {
  // Maximum brightness
  max: 100,
  maximum: 100,
  full: 100,
  "full brightness": 100,
  bright: 100,
  brightest: 100,
  "super bright": 100,
  "very bright": 100,
  "really bright": 100,
  "max brightness": 100,
  "100%": 100,
  "100 percent": 100,
  hundred: 100,

  // High brightness
  high: 80,
  "pretty bright": 80,
  "fairly bright": 80,
  "quite bright": 80,

  // Medium-high
  "medium high": 70,
  "medium-high": 70,

  // Medium brightness
  medium: 50,
  mid: 50,
  middle: 50,
  half: 50,
  "50%": 50,
  "50 percent": 50,
  fifty: 50,
  moderate: 50,
  normal: 50,
  average: 50,

  // Medium-low
  "medium low": 30,
  "medium-low": 30,

  // Low brightness
  low: 25,
  dim: 25,
  dimmed: 25,
  soft: 25,
  subtle: 25,
  faint: 20,
  "pretty dim": 25,
  "fairly dim": 25,
  "quite dim": 25,

  // Very low
  "very low": 15,
  "really low": 15,
  "super low": 15,
  "very dim": 15,
  "really dim": 15,
  "super dim": 15,
  minimal: 10,
  "barely on": 10,
  "barely lit": 10,
  "night light": 10,
  nightlight: 10,

  // Off
  off: 0,
  zero: 0,
  dark: 0,
  darkness: 0,
};

// Temperature keywords (in Kelvin) - COMPREHENSIVE!
const TEMPERATURE_KEYWORDS: Record<string, number> = {
  // Warm (2500-3000K)
  warm: 2700,
  "warm white": 2700,
  "soft white": 2700,
  "warm glow": 2700,
  cozy: 2700,
  relaxing: 2700,
  sunset: 2700,
  candlelight: 2500,
  "candle light": 2500,
  "very warm": 2500,
  "extra warm": 2500,
  "super warm": 2500,
  amber: 2700,
  orange: 2700,
  "warm tone": 2700,

  // Neutral/Natural (3500-4500K)
  neutral: 4000,
  "neutral white": 4000,
  natural: 4000,
  "natural white": 4000,
  "natural light": 4000,
  balanced: 4000,
  standard: 4000,
  normal: 4000,

  // Cool (5000-6000K)
  cool: 5500,
  "cool white": 5500,
  crisp: 5500,
  fresh: 5500,
  energizing: 5500,
  focus: 5500,
  concentrate: 5500,
  "cool tone": 5500,

  // Daylight/Bright (6000-7000K)
  daylight: 6500,
  "bright white": 6500,
  "very bright": 6500,
  "extra bright": 6500,
  "super bright": 6500,
  energize: 6500,
  alert: 6500,
  awake: 6500,
  morning: 6500,
  sunny: 6500,
  sunshine: 6500,
  "blue white": 6500,
  "cool daylight": 6500,
};

export class NaturalLanguageParser {
  /**
   * Parse natural language input into a structured command
   */
  parse(input: string, availableProfiles: LightProfile[] = []): ParsedCommand {
    const normalized = input.toLowerCase().trim();

    // Check for compound commands (e.g., "set to red and dim it")
    const compoundCommand = this.parseCompoundCommand(normalized);
    if (compoundCommand.confidence > 0.7) return { ...compoundCommand, originalText: input };

    // Try to parse each command type in order of specificity
    const powerCommand = this.parsePowerCommand(normalized);
    if (powerCommand.confidence > 0.7) return { ...powerCommand, originalText: input };

    const profileCommand = this.parseProfileCommand(normalized, availableProfiles);
    if (profileCommand.confidence > 0.7) return { ...profileCommand, originalText: input };

    const colorCommand = this.parseColorCommand(normalized);
    if (colorCommand.confidence > 0.6) return { ...colorCommand, originalText: input };

    const temperatureCommand = this.parseTemperatureCommand(normalized);
    if (temperatureCommand.confidence > 0.6) return { ...temperatureCommand, originalText: input };

    const brightnessCommand = this.parseBrightnessCommand(normalized);
    if (brightnessCommand.confidence > 0.6) return { ...brightnessCommand, originalText: input };

    // Unknown command
    return {
      type: "unknown",
      confidence: 0,
      originalText: input,
    };
  }

  private parseCompoundCommand(input: string): ParsedCommand {
    // Split on common conjunctions
    const parts = input.split(/\s+(?:and|then|,)\s+/i);

    if (parts.length > 1) {
      const subCommands: ParsedCommand[] = [];
      let lowestConfidence = 1.0;
      let lightSelector: "all" | "specific" | "first" = "first";

      for (const part of parts) {
        const cmd = this.parseSingleCommand(part.trim());
        if (cmd.type !== "unknown") {
          subCommands.push(cmd);
          lowestConfidence = Math.min(lowestConfidence, cmd.confidence);
          if (cmd.lightSelector === "all") lightSelector = "all";
        }
      }

      if (subCommands.length > 1) {
        return {
          type: "compound",
          subCommands,
          lightSelector,
          confidence: lowestConfidence * 0.9, // Slight penalty for compound commands
          originalText: input,
        };
      }
    }

    return { type: "unknown", confidence: 0, originalText: input };
  }

  private parseSingleCommand(input: string): ParsedCommand {
    const powerCmd = this.parsePowerCommand(input);
    if (powerCmd.confidence > 0.7) return powerCmd;

    const colorCmd = this.parseColorCommand(input);
    if (colorCmd.confidence > 0.6) return colorCmd;

    const brightnessCmd = this.parseBrightnessCommand(input);
    if (brightnessCmd.confidence > 0.6) return brightnessCmd;

    const temperatureCmd = this.parseTemperatureCommand(input);
    if (temperatureCmd.confidence > 0.6) return temperatureCmd;

    return { type: "unknown", confidence: 0, originalText: input };
  }

  private parsePowerCommand(input: string): ParsedCommand {
    const onPatterns = [
      // Basic patterns
      /^(?:turn|switch)\s+(?:on|the lights? on)/i,
      /^(?:lights?|all)\s+on$/i,
      /^on$/i,
      /^power\s+on/i,
      /^enable/i,

      // Natural variations
      /^(?:please\s+)?(?:turn|switch|power)\s+(?:the\s+)?(?:lights?|it|them)\s+on/i,
      /^(?:lights?|all lights?)\s+on$/i,
      /^(?:turn|switch)\s+it\s+on/i,
      /^(?:turn|switch)\s+them\s+on/i,
      /^(?:light|lights)\s+(?:please|plz)/i,
      /^(?:activate|start)/i,
      /^(?:wake|wakeup|wake up)/i,
      /^(?:i want|id like)\s+(?:the\s+)?(?:lights?|light)\s+on/i,
      /^(?:can you|could you|please)\s+turn\s+(?:the\s+)?(?:lights?|light)\s+on/i,

      // Casual/conversational
      /^(?:lights?|light)\s+(?:pls|plz|please)/i,
      /^(?:gimme|give me)\s+(?:some\s+)?light/i,
      /^(?:i need|need)\s+(?:some\s+)?light/i,
      /^let there be light/i,
    ];

    const offPatterns = [
      // Basic patterns
      /^(?:turn|switch)\s+(?:off|the lights? off)/i,
      /^(?:lights?|all)\s+off$/i,
      /^off$/i,
      /^power\s+off/i,
      /^disable/i,
      /^shut\s+(?:off|down)/i,

      // Natural variations
      /^(?:please\s+)?(?:turn|switch|power)\s+(?:the\s+)?(?:lights?|it|them)\s+off/i,
      /^(?:lights?|all lights?)\s+off$/i,
      /^(?:turn|switch)\s+it\s+off/i,
      /^(?:turn|switch)\s+them\s+off/i,
      /^(?:deactivate|stop)/i,
      /^(?:kill|end)\s+(?:the\s+)?(?:lights?|light)/i,
      /^(?:i want|id like)\s+(?:the\s+)?(?:lights?|light)\s+off/i,
      /^(?:can you|could you|please)\s+turn\s+(?:the\s+)?(?:lights?|light)\s+off/i,

      // Casual/conversational
      /^(?:no more|turn off)\s+(?:the\s+)?light/i,
      /^(?:lights?|light)\s+out/i,
      /^darkness/i,
      /^make it dark/i,
    ];

    for (const pattern of onPatterns) {
      if (pattern.test(input)) {
        return {
          type: "power",
          action: "on",
          lightSelector: input.includes("all") ? "all" : "first",
          confidence: 0.95,
          originalText: input,
        };
      }
    }

    for (const pattern of offPatterns) {
      if (pattern.test(input)) {
        return {
          type: "power",
          action: "off",
          lightSelector: input.includes("all") ? "all" : "first",
          confidence: 0.95,
          originalText: input,
        };
      }
    }

    return { type: "unknown", confidence: 0, originalText: input };
  }

  private parseColorCommand(input: string): ParsedCommand {
    // Try to match multi-word colors first (like "deep blue", "sky blue")
    const sortedColors = Object.entries(COLOR_MAP).sort((a, b) => b[0].length - a[0].length);

    for (const [colorName, colorValue] of sortedColors) {
      const colorPatterns = [
        // Direct patterns: "set to deep blue", "change to deep blue"
        new RegExp(`(?:set|change|make|turn)\\s+(?:it|the light[s]?|them)?\\s*(?:to)?\\s*${colorName}\\b`, "i"),
        // Just the color name: "deep blue"
        new RegExp(`^${colorName}$`, "i"),
        // Color at the end: "set the light deep blue"
        new RegExp(`(?:set|change|make)\\s+(?:the\\s+)?(?:light[s]?|it|them)\\s+${colorName}\\b`, "i"),
        // With "color" keyword: "deep blue color"
        new RegExp(`${colorName}\\s+(?:color|light)\\b`, "i"),
        // Go/switch patterns: "go deep blue", "switch to deep blue"
        new RegExp(`(?:go|switch)\\s+(?:to\\s+)?${colorName}\\b`, "i"),
        // Make patterns: "make it deep blue", "make them deep blue"
        new RegExp(`make\\s+(?:it|them|the\\s+light[s]?)?\\s*${colorName}\\b`, "i"),
      ];

      for (const pattern of colorPatterns) {
        if (pattern.test(input)) {
          return {
            type: "color",
            color: colorValue,
            lightSelector: input.includes("all") ? "all" : "first",
            confidence: 0.9,
            originalText: input,
          };
        }
      }
    }

    return { type: "unknown", confidence: 0, originalText: input };
  }

  private parseBrightnessCommand(input: string): ParsedCommand {
    // Check for percentage values with many variations
    const percentPatterns = [/(\d+)\s*%/, /(\d+)\s*percent/i, /(\d+)\s*pct/i];

    for (const pattern of percentPatterns) {
      const match = input.match(pattern);
      if (match) {
        const value = parseInt(match[1], 10);
        if (value >= 0 && value <= 100) {
          return {
            type: "brightness",
            value,
            lightSelector: input.includes("all") || input.includes("every") ? "all" : "first",
            confidence: 0.95,
            originalText: input,
          };
        }
      }
    }

    // Check for brightness keywords (now with multi-word support)
    const sortedKeywords = Object.entries(BRIGHTNESS_KEYWORDS).sort((a, b) => b[0].length - a[0].length);

    for (const [keyword, value] of sortedKeywords) {
      const patterns = [
        // Direct commands
        new RegExp(`(?:set|make|change|turn|put|take)\\s+(?:it|the light[s]?|them)?\\s*(?:to)?\\s*${keyword}\\b`, "i"),
        new RegExp(`^${keyword}$`, "i"),
        new RegExp(`${keyword}\\s+brightness`, "i"),
        new RegExp(`(?:go|switch)\\s+(?:to\\s+)?${keyword}\\b`, "i"),

        // With "the"
        new RegExp(`(?:set|make|change)\\s+the\\s+(?:brightness|light[s]?)\\s+(?:to\\s+)?${keyword}\\b`, "i"),

        // Want/need patterns
        new RegExp(`(?:i want|i need|want|need)\\s+(?:it|them)?\\s*${keyword}\\b`, "i"),
        new RegExp(`(?:make it|make them)\\s+${keyword}\\b`, "i"),

        // At the end
        new RegExp(`brightness\\s+(?:at\\s+|to\\s+)?${keyword}\\b`, "i"),
      ];

      for (const pattern of patterns) {
        if (pattern.test(input)) {
          return {
            type: "brightness",
            value,
            lightSelector: input.includes("all") || input.includes("every") ? "all" : "first",
            confidence: 0.85,
            originalText: input,
          };
        }
      }
    }

    // Relative brightness changes - COMPREHENSIVE
    const dimPatterns = [
      // Basic
      /dim(?:\s+(?:it|the light[s]?|them))?(?:\s+(?:a\s+)?(?:bit|little|tad))?/i,
      /darker/i,
      /lower(?:\s+(?:the\s+)?brightness)?/i,
      /turn\s+down/i,
      /bring\s+down/i,

      // Natural language
      /(?:make it|make them)\s+(?:a bit |a little |somewhat )?(?:dim|darker|dimmer)/i,
      /(?:reduce|decrease)(?:\s+the)?\s+brightness/i,
      /less\s+bright/i,
      /not\s+so\s+bright/i,
      /(?:a bit|a little|slightly|somewhat)\s+darker/i,
      /(?:tone it down|bring it down)/i,
      /softer/i,
      /mellower/i,
    ];

    const brightenPatterns = [
      // Basic
      /bright(?:en)?(?:\s+(?:it|the light[s]?|them))?(?:\s+(?:a\s+)?(?:bit|little|tad))?/i,
      /lighter/i,
      /raise(?:\s+(?:the\s+)?brightness)?/i,
      /turn\s+up/i,
      /bring\s+up/i,

      // Natural language
      /(?:make it|make them)\s+(?:a bit |a little |somewhat )?(?:bright|brighter|lighter)/i,
      /(?:increase|boost|pump up)(?:\s+the)?\s+brightness/i,
      /more\s+bright/i,
      /brighter/i,
      /(?:a bit|a little|slightly|somewhat)\s+brighter/i,
      /(?:crank it up|turn it up)/i,
      /more\s+light/i,
    ];

    for (const pattern of dimPatterns) {
      if (pattern.test(input)) {
        // Determine adjustment based on modifiers
        let adjustment = -25; // default
        if (input.match(/(?:a bit|a little|a tad|slightly|somewhat)/i)) {
          adjustment = -15;
        } else if (input.match(/(?:a lot|much|way|really|very)/i)) {
          adjustment = -40;
        }

        return {
          type: "brightness",
          value: adjustment,
          action: "adjust",
          lightSelector: input.includes("all") || input.includes("every") ? "all" : "first",
          confidence: 0.8,
          originalText: input,
        };
      }
    }

    for (const pattern of brightenPatterns) {
      if (pattern.test(input)) {
        // Determine adjustment based on modifiers
        let adjustment = 25; // default
        if (input.match(/(?:a bit|a little|a tad|slightly|somewhat)/i)) {
          adjustment = 15;
        } else if (input.match(/(?:a lot|much|way|really|very)/i)) {
          adjustment = 40;
        }

        return {
          type: "brightness",
          value: adjustment,
          action: "adjust",
          lightSelector: input.includes("all") || input.includes("every") ? "all" : "first",
          confidence: 0.8,
          originalText: input,
        };
      }
    }

    return { type: "unknown", confidence: 0, originalText: input };
  }

  private parseTemperatureCommand(input: string): ParsedCommand {
    // Sort keywords by length to match multi-word first
    const sortedKeywords = Object.entries(TEMPERATURE_KEYWORDS).sort((a, b) => b[0].length - a[0].length);

    for (const [keyword, kelvin] of sortedKeywords) {
      const patterns = [
        // Basic patterns
        new RegExp(`(?:set|change|make|turn|switch|go)\\s+(?:to)?\\s*${keyword}\\b`, "i"),
        new RegExp(`^${keyword}$`, "i"),

        // Temperature/color temp keywords
        new RegExp(
          `(?:set|make|change)\\s+(?:the\\s+)?(?:temperature|temp|color temp)\\s+(?:to\\s+)?${keyword}\\b`,
          "i",
        ),

        // Natural variations
        new RegExp(`(?:i want|i need|want|need)\\s+${keyword}\\b`, "i"),
        new RegExp(`(?:make it|make them)\\s+${keyword}\\b`, "i"),
        new RegExp(`${keyword}\\s+(?:light|lighting|temperature)`, "i"),

        // Mood/context-based
        new RegExp(`${keyword}\\s+(?:mode|vibe|mood|setting)`, "i"),
      ];

      for (const pattern of patterns) {
        if (pattern.test(input)) {
          return {
            type: "temperature",
            temperature: kelvin,
            lightSelector: input.includes("all") || input.includes("every") ? "all" : "first",
            confidence: 0.85,
            originalText: input,
          };
        }
      }
    }

    // Check for Kelvin values with variations
    const kelvinPatterns = [/(\d{4,5})\s*k(?:elvin)?/i, /(\d{4,5})\s*degrees\s*k(?:elvin)?/i];

    for (const pattern of kelvinPatterns) {
      const match = input.match(pattern);
      if (match) {
        const kelvin = parseInt(match[1], 10);
        if (kelvin >= 2500 && kelvin <= 9000) {
          return {
            type: "temperature",
            temperature: kelvin,
            lightSelector: input.includes("all") || input.includes("every") ? "all" : "first",
            confidence: 0.9,
            originalText: input,
          };
        }
      }
    }

    return { type: "unknown", confidence: 0, originalText: input };
  }

  private parseProfileCommand(input: string, profiles: LightProfile[]): ParsedCommand {
    // Look for profile-related keywords - COMPREHENSIVE
    const profilePatterns = [
      // Basic profile commands
      /(?:set|load|apply|use|activate)(?:\s+to)?(?:\s+my)?(?:\s+the)?\s+(.+?)\s+profile/i,
      /profile\s+(.+)/i,
      /(?:set|load|apply|use|activate)(?:\s+to)?(?:\s+my)?\s+(.+?)(?:\s+(?:scene|preset|setting))?$/i,
      /(?:switch to|go to|change to)(?:\s+my)?\s+(.+)/i,

      // Natural variations
      /(?:i want|i need|want|need)(?:\s+my)?\s+(.+)\s+(?:profile|scene|preset|setting)/i,
      /(?:i want|i need|want|need)(?:\s+the)?\s+(.+)/i,

      // Scene/preset variations
      /(?:set|use|apply)(?:\s+the)?\s+(.+)\s+(?:scene|preset)/i,
      /scene\s+(.+)/i,
      /preset\s+(.+)/i,

      // Casual variations
      /(?:gimme|give me)(?:\s+my)?\s+(.+)/i,
      /(?:put on|turn on)(?:\s+my)?\s+(.+)\s+(?:scene|profile|preset|setting)/i,
      /(?:let's go with|lets go with|go with)(?:\s+the)?\s+(.+)/i,
    ];

    for (const pattern of profilePatterns) {
      const match = input.match(pattern);
      if (match) {
        const profileNameQuery = match[1].trim().toLowerCase();

        // Skip if it's just a color name
        if (COLOR_MAP[profileNameQuery]) {
          continue;
        }

        // Find matching profile (with fuzzy matching)
        const matchedProfile = profiles.find((p) => {
          const profileNameLower = p.name.toLowerCase();
          const nameMatch =
            profileNameLower.includes(profileNameQuery) ||
            profileNameQuery.includes(profileNameLower) ||
            this.fuzzyMatch(profileNameLower, profileNameQuery);

          // Also check tags
          const tagMatch = p.tags?.some(
            (tag) => tag.toLowerCase() === profileNameQuery || tag.toLowerCase().includes(profileNameQuery),
          );

          return nameMatch || tagMatch;
        });

        if (matchedProfile) {
          return {
            type: "profile",
            profileName: matchedProfile.name,
            lightSelector: "all",
            confidence: 0.95,
            originalText: input,
          };
        } else {
          // Profile keyword found but no matching profile
          return {
            type: "profile",
            profileName: profileNameQuery,
            lightSelector: "all",
            confidence: 0.5,
            originalText: input,
          };
        }
      }
    }

    return { type: "unknown", confidence: 0, originalText: input };
  }

  /**
   * Simple fuzzy matching for profile names
   */
  private fuzzyMatch(str1: string, str2: string): boolean {
    // Remove common words and check if one contains most of the other
    const removeCommon = (s: string) => s.replace(/\b(the|my|a|an|to|for|and|or|of|in|on|at)\b/gi, "").trim();

    const cleaned1 = removeCommon(str1);
    const cleaned2 = removeCommon(str2);

    if (cleaned1.includes(cleaned2) || cleaned2.includes(cleaned1)) {
      return true;
    }

    // Check if they share significant portions
    const words1 = cleaned1.split(/\s+/);
    const words2 = cleaned2.split(/\s+/);

    const sharedWords = words1.filter((w) => words2.some((w2) => w2.includes(w) || w.includes(w2)));

    return sharedWords.length >= Math.min(words1.length, words2.length) * 0.6;
  }

  /**
   * Generate a human-readable description of the parsed command
   */
  describeCommand(command: ParsedCommand): string {
    switch (command.type) {
      case "power":
        return `Turn ${command.action === "on" ? "on" : "off"} ${command.lightSelector === "all" ? "all lights" : "light"}`;
      case "color":
        if (command.color) {
          const colorName = Object.entries(COLOR_MAP).find(
            ([, val]) => val.hue === command.color!.hue && val.saturation === command.color!.saturation,
          )?.[0];
          return `Set color to ${colorName || "custom"}`;
        }
        return "Change color";
      case "brightness":
        if (command.action === "adjust") {
          return command.value! > 0
            ? `Increase brightness by ${command.value}%`
            : `Decrease brightness by ${Math.abs(command.value!)}%`;
        }
        return `Set brightness to ${command.value}%`;
      case "temperature":
        return `Set color temperature to ${command.temperature}K`;
      case "profile":
        return `Apply profile: ${command.profileName}`;
      case "compound":
        if (command.subCommands && command.subCommands.length > 0) {
          return command.subCommands.map((cmd) => this.describeCommand(cmd)).join(" + ");
        }
        return "Compound command";
      default:
        return "Unknown command";
    }
  }
}
