declare module "macos-touchid" {
  export function canAuthenticate(): boolean;
  export function authenticate(reason: string, callback: (error: Error | null) => void): void;
}
