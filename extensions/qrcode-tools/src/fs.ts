import * as tmp from "tmp";

export async function getTempFilePath(ext = "") {
  return new Promise<string>((resolve, reject) => {
    tmp.file(
      {
        prefix: "raycast-qrcode-tools",
        postfix: ext,
      },
      (err, path) => {
        if (err) return reject(err);
        resolve(path);
      }
    );
  });
}
