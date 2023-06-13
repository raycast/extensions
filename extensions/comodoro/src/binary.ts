import fs = require("node:fs");

export function has(binaryPath: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    fs.stat(binaryPath, (error, stats) => {
      if (error) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}
