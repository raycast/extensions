declare module "node-spotlight" {
  interface SpotlightResult {
    path: string;
  }

  function spotlight(query: string): AsyncIterableIterator<SpotlightResult>;
  export default spotlight;
}
