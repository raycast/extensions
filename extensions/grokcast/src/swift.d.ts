// Types for the Swift helper in `recorder/`. `ray build` generates the same
// declarations into `raycast-env.d.ts`; this copy lets `tsc` run before a build.
declare module "swift:*/recorder" {
  export function microphoneAccess(): Promise<string>
  export function requestMicrophoneAccess(): Promise<boolean>
}
