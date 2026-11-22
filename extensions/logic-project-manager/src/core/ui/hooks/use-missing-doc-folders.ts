import { useEffect, useState } from "react";
import fs from "node:fs";
import { getDocFolder, type DocKind } from "@/core/docs/docs";

export type MissingDocFolders = Record<DocKind, string | null>;

const NONE: MissingDocFolders = { notes: null, lyrics: null };

// 自定义文件夹是否失效：路径为空算正常，读不到才算失效。
async function missingFolder(kind: DocKind): Promise<string | null> {
  const folder = getDocFolder(kind);
  if (folder === "") return null;
  try {
    await fs.promises.access(folder);
    return null;
  } catch {
    return folder;
  }
}

/** 笔记 / 歌词的自定义文件夹是否失效（被改名、移动或外接盘未挂载）。
 *  只在命令打开时查一次：扩展自己不会创建这些文件夹，打开期间不会变。
 *  中途被删的情况要重开命令才反映，那时保存会报错并提示。
 *  查磁盘放在 effect 里并用异步 API，渲染路径不碰磁盘。 */
export function useMissingDocFolders(): MissingDocFolders {
  const [missing, setMissing] = useState<MissingDocFolders>(NONE);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [notes, lyrics] = await Promise.all([missingFolder("notes"), missingFolder("lyrics")]);
      if (cancelled) return;
      setMissing({ notes, lyrics });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return missing;
}
