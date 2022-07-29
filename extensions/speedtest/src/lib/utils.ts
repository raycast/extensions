import sha256 from "sha256-file";

export function pingToString(ping: number | undefined): string {
  return ping === undefined ? "?" : ping.toFixed(1) + " ms";
}

export function speedToString(speed: number | undefined): string {
  if (speed === undefined) {
    return "?";
  }
  let bits = speed * 8;
  const units = ["", "K", "M", "G", "T"];
  const places = [0, 1, 2, 3, 3];
  let unit = 0;
  while (bits >= 2000 && unit < 4) {
    unit++;
    bits /= 1000;
  }
  return `${bits.toFixed(places[unit])} ${units[unit]}bps`;
}

export async function sha256FileHash(filename: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    sha256(filename, (error: Error | null, sum: string | null) => {
      if (error) {
        reject(error);
      } else {
        resolve(sum);
      }
    });
  });
}
