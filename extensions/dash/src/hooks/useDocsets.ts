import tempy from "tempy";
import { useState, useEffect } from "react";
import { usePersistentState } from "raycast-toolkit";
import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import useDashApp from "./useDashApp";
import { Docset } from "../types";
import { Application } from "@raycast/api";

export default function useDocsets(): [Docset[], boolean] {
  const [isLoading, setLoading] = useState(true);
  const [docsets, setDocsets, isDocsetsLoading] = usePersistentState<Docset[]>("docsets-v1", []);
  const [dashApp, isDashAppLoading] = useDashApp();

  useEffect(() => {
    if (!dashApp || isDashAppLoading) {
      return;
    }
    (async () => {
      setLoading(true);
      try {
        setDocsets(await getDocsets(dashApp));
      } catch (err) {
        setDocsets([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [dashApp]);

  return [docsets, isLoading || isDocsetsLoading];
}

async function getDocsets(dashApp: Application): Promise<Docset[]> {
  const filename = tempy.file({ extension: ".json" });
  execSync(`defaults read ${dashApp.bundleId} docsets | plutil -convert json -r -o ${filename} -`);
  const data = readFileSync(filename, "utf8");
  return JSON.parse(data).map((docset: Docset) => ({
    ...docset,
    iconPath: getDocsetIconPath(dashApp.path, docset.docsetPath, docset.docsetBundle),
    docsetKeyword: stripColon(
      docset.keyword ||
        docset.effectiveKeyword ||
        docset.suggestedKeyword ||
        docset.pluginKeyword ||
        docset.docsetBundle,
    ),
  }));
}

function getDocsetIconPath(dashAppPath: string, docsetPath: string, docsetBundle: string): string {
  return (
    [
      `${docsetPath}/icon@2x.png`,
      `${docsetPath}/icon.png`,
      `${docsetPath}/icon.tiff`,
      `${dashAppPath}/Contents/Resources/${docsetBundle}.tiff`,
    ].find(existsSync) || "list-icon.png"
  );
}

function stripColon(s: string): string {
  return s.substring(s.length - 1) === ":" ? s.substring(0, s.length - 1) : s;
}
