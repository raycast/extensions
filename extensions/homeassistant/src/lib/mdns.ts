import multicast_dns from "multicast-dns";

export function queryMdns(address: string, timeout = 5000) {
  return new Promise<string | undefined>((resolve, reject) => {
    const mdns = multicast_dns();
    let aaaaFallback: string | undefined;
    mdns.on("response", (response) => {
      const answers = response.answers.filter((e) => e.name === address);
      const aRecord = answers.find((e) => e.type === "A");
      if (aRecord) {
        clearTimeout(timer);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = (aRecord as any).data as string | undefined;
        if (data) {
          resolve(data);
        } else {
          resolve(undefined);
        }
        return;
      }
      // Answers can be spread across multiple response packets, so keep the
      // AAAA address as a fallback in case no A record arrives before timeout
      const aaaaRecord = answers.find((e) => e.type === "AAAA");
      if (aaaaRecord && !aaaaFallback) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        aaaaFallback = (aaaaRecord as any).data as string | undefined;
      }
    });

    mdns.query(address, (error) => {
      if (error) {
        clearTimeout(timer);
        resolve(undefined);
      }
    });

    const timer = setTimeout(() => {
      mdns.destroy();
      if (aaaaFallback) {
        resolve(aaaaFallback);
      } else {
        reject(new Error("mDNS request timeout"));
      }
    }, timeout);
  });
}
