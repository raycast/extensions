/**
 * Configuration for Claude Code hooks.
 * @see https://code.claude.com/docs/en/hooks
 */
export type ClaudeHook = {
  type: "command";
  command: string;
};

export type ClaudeMatcher = {
  matcher: string;
  hooks: ClaudeHook[];
};

export type ClaudeSettings = {
  hooks?: {
    [key: string]: ClaudeMatcher[];
  };
};

/**
 * Configuration for Cursor editor hooks.
 * @see https://cursor.com/docs/agent/hooks
 */
export type CursorHookEntry = {
  command: string;
};

export type CursorHooks = {
  version: 1;
  hooks: {
    beforeSubmitPrompt?: CursorHookEntry[];
    stop?: CursorHookEntry[];
    [key: string]: CursorHookEntry[] | undefined | number;
  };
};

/**
 * Configuration for Opencode plugins.
 */
export type OpencodeConfig = {
  plugins?: Record<string, { enabled: boolean }>;
};
