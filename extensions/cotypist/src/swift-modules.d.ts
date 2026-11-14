// Types for the Swift bridge. `ray build` generates the real bindings; this keeps `tsc` usable without Xcode.
declare module "swift:../swift/cotypist-control" {
  export function runControl(operation: string): Promise<string>;
}
