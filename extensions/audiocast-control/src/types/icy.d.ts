declare module "icy" {
  import type { ClientRequest, IncomingMessage, RequestOptions } from "http";

  interface Metadata {
    StreamTitle: string;
  }

  function get(url: string | RequestOptions, callback: (res: IncomingMessage) => void): ClientRequest;
  function parse(metadata: string): Metadata;
}
