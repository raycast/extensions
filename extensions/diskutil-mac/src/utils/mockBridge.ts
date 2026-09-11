/**
 * Bridge between production code and the mock layer.
 *
 * Committed state: STUB. No `import from "../mocks/..."`, so esbuild can't
 * reach `src/mocks/` and drops the whole folder from the shipped bundle.
 *
 * `npm run dev:mock` rewrites this file to re-export from the real mock
 * module; `dev` / `mock off` / `build` / `publish` rewrite it back. The
 * swap is visible in `git status` so it can't be committed by accident.
 * Production code MUST import from here, never from `../mocks/...` directly.
 */
export const isMockEnabled = (): boolean => false;
export const mockExec = async (command: string): Promise<string> => {
  throw new Error(`Mock layer is not active (received: ${command}). Run \`npm run dev:mock\` to enable.`);
};
