declare module "swift:../swift/movecursor" {
  export function moveCursor(direction: string, placement: string): string | Promise<string>;
}
