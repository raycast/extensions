declare module "node-fetch" {
  export default function fetch(url: string, init?: RequestInit): Promise<Response>;
}
