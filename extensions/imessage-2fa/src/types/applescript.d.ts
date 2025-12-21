declare module "applescript" {
  export function execString(script: string, callback: (err: Error | null, result?: unknown) => void): void;
}
