import fs = require("node:fs");

export function has(binaryPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    fs.stat(binaryPath, (error, stats) => {
      if (error) {
        resolve(false);
      } else {
        if (stats.isFile()) {
          resolve(true);
        } else {
          resolve(false);
        }
      }
    });
  });
}
