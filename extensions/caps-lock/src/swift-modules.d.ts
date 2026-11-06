// Types for the Swift bridge. `ray build` generates the real bindings; this keeps `tsc` usable without Xcode.
declare module "swift:../swift/caps-lock" {
  export function toggleCapsLock(): Promise<boolean>;
  export function setCapsLock(on: boolean): Promise<boolean>;
  export function getCapsLock(): Promise<boolean>;
}
