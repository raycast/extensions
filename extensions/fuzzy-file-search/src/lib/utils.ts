import sha256 from "sha256-file";

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
