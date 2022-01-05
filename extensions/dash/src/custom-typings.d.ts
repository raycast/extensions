declare module "child_process" {
  interface ExecOptions extends CommonOptions {
    shell?: string | undefined;
    maxBuffer?: number | undefined;
    killSignal?: NodeJS.Signals | number | undefined;
    // For some reason the main definitions don't include signal
    signal?: AbortSignal | undefined;
  }
}
