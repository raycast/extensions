export interface CastArg {
  required: boolean;
  name: string;
  flag?: string;
  type?: "string" | "boolean";
}

export interface Opts {
  saveToClipboard?: boolean;
  outputParser?: (stdout: string, ...extra: any) => string;
  errorParser?: (stderr: string, ...extra: any) => string;
  successMessage?: string;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
}
