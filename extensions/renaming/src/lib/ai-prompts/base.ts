/**
 * Base instructions and shared constants for AI prompts
 */

import { DISPLAY_CONSTANTS } from "../constants";

export const MAX_SUGGESTED_NAME_LENGTH = DISPLAY_CONSTANTS.MAX_SUGGESTED_NAME_LENGTH;

export const BASE_INSTRUCTIONS = `Generate a descriptive filename for this file. Rules:
- Use lowercase with underscores (snake_case)
- Be concise but descriptive (max ${MAX_SUGGESTED_NAME_LENGTH} chars)
- No file extension
- No special characters except underscores
- No generic names like "image", "document", "file"
- Return ONLY the filename, nothing else`;
