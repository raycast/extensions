import tempy from "tempy";
import { exec } from "child_process";
import { existsSync, readFile } from "fs";
import { getDashAppPath } from "./dashApp";

export type Docset = {
  docsetBundle: string;
  docsetName: string;
  docsetPath: string;
}

export function getDocsets(): Promise<Docset[]> {
  return new Promise((resolve, reject) => {
    const filename = tempy.file({ extension: ".json" });

    exec(`defaults read com.kapeli.dashdoc docsets | plutil -convert json -r -o ${filename} -`, (err) => {
      if (err) {
        return reject(err);
      }

      readFile(filename, "utf8", (err, data) => {
        if (err) {
          return reject(err);
        }

        const docSets = JSON.parse(data);

        resolve(docSets);
      });
    });
  });
}

export function getDocsetIconPath(docset: Docset): string {
  const dashAppPath = getDashAppPath();

  return [
    `${docset.docsetPath}/icon@2x.png`,
    `${docset.docsetPath}/icon.png`,
    `${docset.docsetPath}/icon.tiff`,
    `${dashAppPath}/Contents/Resources/${docset.docsetBundle}.tiff`
  ].find(existsSync) || "list-icon.png";
}
