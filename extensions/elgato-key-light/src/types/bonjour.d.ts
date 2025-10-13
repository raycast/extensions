declare module "bonjour-service" {
  interface BonjourBrowser {
    stop(): void;
    on(event: "up" | "down", listener: (service: BonjourService) => void): this;
    on(event: "error", listener: (error: Error) => void): this;
  }

  interface BonjourService {
    name: string;
    type: string;
    protocol: string;
    addresses: string[];
    referer: {
      address: string;
      family: string;
      port: number;
      size: number;
    };
    port: number;
    host: string;
    fqdn: string;
  }

  class Bonjour {
    constructor();
    find(query: { type: string }, callback: (service: BonjourService) => void): BonjourBrowser;
    destroy(): void;
  }

  export = Bonjour;
}
