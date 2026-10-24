declare module "applescript" {
  export function execString(script: string, callback: (err: Error | null, result?: any) => void): void;
}
