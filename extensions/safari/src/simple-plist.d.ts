declare module "simple-plist" {
  const bplistParser: { maxObjectCount: number };
  const readFile: (file: string) => BookmarkPListResult;
  export { bplistParser, readFile };
}
