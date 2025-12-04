import { ShellApi } from "./shell";
import { adapterFactory } from "./shell/adapters/adapter.factory";
import { getHostShell } from "./shell/host-shell";

export const api = {
  shell: () => {
    const hostShell = getHostShell();
    const adapter = adapterFactory(hostShell);
    return new ShellApi(adapter);
  },
};
