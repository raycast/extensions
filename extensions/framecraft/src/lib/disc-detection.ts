import http from "node:http";

/** Probe optical-disc volume descriptors only through the budgeted loopback source. */
export async function detectRemoteDisc(target: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const url = new URL(target);
    if (url.hostname !== "127.0.0.1" || url.protocol !== "http:") {
      reject(new Error("Disc detection must go through the restricted read channel"));
      return;
    }
    let data = Buffer.alloc(0);
    const req = http.get(url, { headers: { Range: "bytes=32768-65535" } }, (response) => {
      if (response.statusCode === 416) {
        response.resume();
        resolve(false);
        return;
      }
      if (response.statusCode !== 206) {
        response.destroy();
        reject(new Error("Couldn't read the disc identifier"));
        return;
      }
      response.on("data", (chunk: Buffer) => {
        data = Buffer.concat([data, chunk]);
        if (data.length > 32768) response.destroy(new Error("Disc identifier response is too large"));
      });
      response.on("end", () => {
        let found = false;
        for (let offset = 0; offset + 6 <= data.length; offset += 2048) {
          const id = data.subarray(offset + 1, offset + 6).toString("ascii");
          if (["CD001", "BEA01", "NSR02", "NSR03"].includes(id)) found = true;
        }
        resolve(found);
      });
      response.on("error", reject);
    });
    req.setTimeout(15000, () => req.destroy(new Error("Timed out reading the disc identifier")));
    req.once("error", reject);
  });
}
