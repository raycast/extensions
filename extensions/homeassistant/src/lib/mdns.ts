import multicast_dns from "multicast-dns";

export function queryMdns(address: string) {
  return new Promise<string | undefined>((resolve, reject) => {
    const mdns = multicast_dns();
    mdns.on("response", (response) => {
      const homeassistantData = response.answers.find((e) => e.name === address);
      if (homeassistantData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = (homeassistantData as any).data as string | undefined;
        if (data) {
          resolve(data);
        } else {
          resolve(undefined);
        }
      }
    });

    mdns.query(address, (error, bytes) => {
      if (error) {
        resolve(undefined);
      }
    });
  });
}
