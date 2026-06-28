import { UnsupportedShellError } from "../errors/unsupported-shell.error";
import { AbstractAdapter } from "./abstract.adapter";
import { ZshAdapter } from "./zsh.adapter";

export const adapterFactory = (shell: string) => {
  const adapter = adapters[shell];
  if (!adapter) {
    throw new UnsupportedShellError(shell);
  }
  return new adapter();
};

const adapters: Record<string, new (...args: unknown[]) => AbstractAdapter> = {
  "/bin/zsh": ZshAdapter,
};
