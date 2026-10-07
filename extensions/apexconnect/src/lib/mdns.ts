import multicast_dns from "multicast-dns";

export function queryMdns(address: string, timeout = 5000) {
  return new Promise<string | undefined>((resolve, reject) => {
    const mdns = multicast_dns();
    // Every path through this promise must destroy the socket: left open, it
    // keeps listening and accumulates with every later .local resolution.
    const finish = (fn: () => void) => {
      clearTimeout(timer);
      mdns.destroy();
      fn();
    };

    mdns.on("response", (response) => {
      const mdnsAnswer = response.answers.find((e) => e.name === address);
      if (mdnsAnswer) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = (mdnsAnswer as any).data as string | undefined;
        finish(() => resolve(data));
      }
    });

    mdns.query(address, (error) => {
      if (error) {
        finish(() => resolve(undefined));
      }
    });

    const timer = setTimeout(() => {
      finish(() => reject(new Error("mDNS request timeout")));
    }, timeout);
  });
}
