import multicast_dns from "multicast-dns";

export function queryMdns(address: string, timeout = 5000, aaaaFallbackDelay = 1000) {
  return new Promise<string | undefined>((resolve, reject) => {
    const mdns = multicast_dns();
    let aaaaTimer: NodeJS.Timeout | undefined;
    const finish = (result: string | undefined) => {
      clearTimeout(timer);
      clearTimeout(aaaaTimer);
      mdns.destroy();
      resolve(result);
    };
    mdns.on("response", (response) => {
      const answers = response.answers.filter((e) => e.name === address);
      const aRecord = answers.find((e) => e.type === "A");
      if (aRecord) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        finish((aRecord as any).data as string | undefined);
        return;
      }
      const aaaaRecord = answers.find((e) => e.type === "AAAA");
      if (aaaaRecord && !aaaaTimer) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = (aaaaRecord as any).data as string | undefined;
        if (data) {
          // Answers can be spread across multiple response packets, so give a
          // preferred A record a short window to arrive before using the IPv6
          aaaaTimer = setTimeout(() => finish(data), aaaaFallbackDelay);
        }
      }
    });

    mdns.query(address, (error) => {
      if (error) {
        finish(undefined);
      }
    });

    const timer = setTimeout(() => {
      clearTimeout(aaaaTimer);
      mdns.destroy();
      reject(new Error("mDNS request timeout"));
    }, timeout);
  });
}
