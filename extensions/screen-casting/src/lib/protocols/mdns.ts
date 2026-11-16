import { Bonjour, Service } from "bonjour-service";

/**
 * Browse mDNS for a service type for `durationMs`, re-querying periodically (a single query is easily
 * missed by devices waking from standby). Rejects if the mDNS socket fails (e.g. no network access).
 */
export function browseMdns(type: string, onService: (service: Service) => void, durationMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    let done = false;
    const finish = (err?: unknown) => {
      if (done) return;
      done = true;
      clearInterval(requery);
      clearTimeout(timer);
      try {
        browser.stop();
        bonjour.destroy();
      } catch {
        // socket already closed
      }
      if (err) reject(err instanceof Error ? err : new Error(String(err)));
      else resolve();
    };
    // Without an error callback, bonjour-service throws socket errors from an event handler.
    const bonjour = new Bonjour({}, (err: unknown) => finish(err));
    const browser = bonjour.find({ type }, (service) => {
      try {
        onService(service);
      } catch {
        // ignore malformed services
      }
    });
    const requery = setInterval(() => browser.update(), 1500);
    const timer = setTimeout(() => finish(), durationMs);
  });
}
