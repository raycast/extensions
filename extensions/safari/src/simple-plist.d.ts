declare module "simple-plist" {
  const readFile: (file: string) => BookmarkPListResult;
  export { readFile };
}
