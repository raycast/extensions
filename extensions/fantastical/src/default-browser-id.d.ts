declare module "default-browser-id" {
  type DefaultBrowserIdFunction = () => Promise<string>;
  const defaultBrowserId: DefaultBrowserIdFunction;
  export default defaultBrowserId;
}
