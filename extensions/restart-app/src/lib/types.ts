/** Activation policies reported by NSRunningApplication. */
export const ActivationPolicy = {
  Regular: 0,
  Accessory: 1,
  Prohibited: 2,
} as const;

/** A running application exactly as reported by the JXA AppKit snapshot. */
export interface RawRunningApp {
  pid: number;
  name: string | null;
  bundleId: string | null;
  bundlePath: string | null;
  executablePath: string | null;
  activationPolicy: number;
  terminated: boolean;
}

export type AppKind = "regular" | "accessory";

/** A running application that passed the restartable filter. */
export interface RestartableApp {
  pid: number;
  name: string;
  bundleId: string;
  bundlePath: string;
  executablePath: string;
  kind: AppKind;
}

export type RestartMode = "graceful" | "force";
