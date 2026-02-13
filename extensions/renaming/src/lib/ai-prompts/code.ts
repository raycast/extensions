/**
 * AI prompt for code/programming files
 */

import type { FileInfo, AIPromptConfig } from "../../types";
import { BASE_INSTRUCTIONS, MAX_SUGGESTED_NAME_LENGTH } from "./base";

export function getCodePrompt(file: FileInfo): AIPromptConfig {
  return {
    fileType: "code",
    prompt: `${BASE_INSTRUCTIONS}

This is a code/programming file.
Current name: ${file.baseName}
Extension: ${file.extension}

Suggest a descriptive name following programming conventions. Consider:
- Purpose of the file (component, utility, config, test)
- Module or feature name
- Common naming patterns for this file type`,
    maxLength: MAX_SUGGESTED_NAME_LENGTH,
  };
}
