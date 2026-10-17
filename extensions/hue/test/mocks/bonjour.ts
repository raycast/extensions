// Stands in for bonjour-service, so no test sends mDNS queries. Tests set the service the query finds.
type Service = { addresses?: string[]; txt?: { bridgeid: string } };

export const mdns = { answer: null as Service | null, queries: 0, destroyed: 0 };

export function resetMdns() {
  Object.assign(mdns, { answer: null, queries: 0, destroyed: 0 });
}

export default class Bonjour {
  findOne(_query: object, _timeout: number, callback: (service: Service | null) => void) {
    mdns.queries++;
    setImmediate(() => callback(mdns.answer));
    return { update: () => {} };
  }

  destroy() {
    mdns.destroyed++;
  }
}
