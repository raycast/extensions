import { LocalStorage } from "@raycast/api";

export interface RegexRule {
  id: string;
  name: string;
  findPattern: string;
  replaceWith: string;
  isActive: boolean;
}

export async function getCommandRules(commandId: string): Promise<RegexRule[]> {
  const rulesString = await LocalStorage.getItem<string>(`rules_${commandId}`);
  if (!rulesString) {
    return [];
  }
  try {
    return JSON.parse(rulesString) as RegexRule[];
  } catch (error) {
    console.error("Failed to parse rules for command", commandId, error);
    return [];
  }
}

export function applyRules(text: string, rules: RegexRule[]): string {
  let processedText = text;

  // Filter only active rules
  const activeRules = rules.filter((rule) => rule.isActive);

  for (const rule of activeRules) {
    try {
      // Use global and multiline flags by default
      const regex = new RegExp(rule.findPattern, "gm");

      // Handle literal escape sequences in replaceWith that a user might type
      const replacement = rule.replaceWith.replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\r/g, "\r");

      processedText = processedText.replace(regex, replacement);
    } catch (error) {
      console.error(`Failed to apply rule: ${rule.name}`, error);
    }
  }

  return processedText;
}
