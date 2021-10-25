import tempy from "tempy";
import { useState, useEffect } from "react";
import { exec } from "child_process";
import { existsSync, readFile } from "fs";
import { getDashAppPath } from "./dashApp";

export type Docset = {
  docsetBundle: string;
  docsetName: string;
  docsetPath: string;
  docsetKeyword: string;
  keyword: string;
  pluginKeyword: string;
}

export function useDocsets(searchText: string): [Docset[], boolean] {
  const [isLoading, setLoading] = useState<boolean>(false);
  const [docsets, setDocsets] = useState<Docset[]>([]);
  const [filteredDocsets, setFilteredDocsets] = useState<Docset[]>([]);

  useEffect(() => {
    setLoading(true);
    getDocsets().then((docsets) => {
      setDocsets(docsets);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    setFilteredDocsets(
      docsets.filter((docset) =>
        docset.docsetName.toLowerCase().includes(searchText.toLowerCase())
        || docset.docsetKeyword.toLowerCase().includes(searchText.toLowerCase())
      )
    );
  }, [searchText]);

  return [searchText.length ? filteredDocsets : docsets, isLoading];
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

        const docSets = JSON.parse(data)
          .map((docset:Docset) => {
            function stripColon(s:string): string {
              return s.substr(s.length - 1) === ':'
                ? s.substr(0, s.length - 1)
                : s
            }

            return {
              ...docset,
              docsetKeyword : 'keyword' in docset
                ? stripColon(docset.keyword)
                : 'pluginKeyword' in docset
                  ? stripColon(docset.pluginKeyword)
                  : stripColon(docset.docsetBundle)
            }

          });

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
