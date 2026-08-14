import type { PromptProps } from "../managers/prompt-manager";
import { SpecificReplacements, getPropertyByPath, toPlaceholderKey, buildEffectiveMap } from "./placeholder-formatter";

export function findUsedOptionPlaceholders(prompt: PromptProps, replacements: SpecificReplacements): string[] {
  const usedOptionKeys: string[] = [];
  if (!prompt.content) return usedOptionKeys;

  const map = buildEffectiveMap(replacements as SpecificReplacements & Record<string, unknown>);

  const regex = /{{(?:(file|option):)?([^}]+)}}/g;
  let match;

  while ((match = regex.exec(prompt.content)) !== null) {
    const [, directive, body] = match;

    if (!directive) {
      const content = body.trim();

      if (content.includes("|")) {
        const parts = content.split("|");

        for (const part of parts) {
          const trimmedPart = part.trim();

          const directiveMatch = trimmedPart.match(/^option:(.+)$/);
          if (directiveMatch) {
            const optionKey = directiveMatch[1];

            let shouldUseThisOption = true;
            const currentPartIndex = parts.indexOf(part);

            for (let i = 0; i < currentPartIndex; i++) {
              const prevPart = parts[i].trim();

              if (prevPart.startsWith("option:") || prevPart.startsWith("file:") || prevPart.startsWith("content:")) {
                continue;
              } else {
                const key = toPlaceholderKey(prevPart);
                if (key && map.has(key) && map.get(key) !== "") {
                  shouldUseThisOption = false;
                  break;
                }
              }
            }

            if (shouldUseThisOption) {
              const optionValue = getPropertyByPath(prompt, optionKey);
              if (
                (Array.isArray(optionValue) && optionValue.length > 0) ||
                (optionValue &&
                  typeof optionValue === "object" &&
                  !Array.isArray(optionValue) &&
                  Object.keys(optionValue).length > 0)
              ) {
                usedOptionKeys.push(optionKey);
              }
              break;
            }
          }
        }
      }
    } else if (directive === "option") {
      const optionKey = body.trim();
      const optionValue = getPropertyByPath(prompt, optionKey);
      if (
        (Array.isArray(optionValue) && optionValue.length > 0) ||
        (optionValue &&
          typeof optionValue === "object" &&
          !Array.isArray(optionValue) &&
          Object.keys(optionValue).length > 0)
      ) {
        usedOptionKeys.push(optionKey);
      }
    }
  }

  return Array.from(new Set(usedOptionKeys));
}
