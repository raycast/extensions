import { useState, useEffect } from "react";
import { readFileSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

interface FolderInfo {
  id: string;
  name: string;
  url: string;
}

export function useConfig() {
  const [folderIds, setFolderIds] = useState<string[]>([]);
  const [folderInfos, setFolderInfos] = useState<FolderInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadConfig = async () => {
    try {
      setIsLoading(true);

      // Core側の設定ファイルから直接読み込み
      const configPath = join(homedir(), "Library", "Application Support", "fuzzy-drive-search", "config.toml");

      if (!existsSync(configPath)) {
        setFolderIds([]);
        return;
      }

      const configContent = readFileSync(configPath, "utf8");

      // target_folder_ids = ["id1", "id2"] の形式から配列を抽出
      const match = configContent.match(/target_folder_ids\s*=\s*\[(.*?)\]/s);
      if (match) {
        const idsString = match[1];
        const ids = idsString
          .split(",")
          .map((id) => id.trim().replace(/['"]/g, ""))
          .filter((id) => id.length > 0);
        setFolderIds(ids);

        // フォルダ名も取得
        await loadFolderNames(ids);
      } else {
        setFolderIds([]);
        setFolderInfos([]);
      }
    } catch (error) {
      console.error("設定読み込みエラー:", error);
      setFolderIds([]);
      setFolderInfos([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFolderNames = async (ids: string[]) => {
    try {
      // JSONキャッシュからフォルダ名を取得
      const cachePath = join(homedir(), "Library", "Application Support", "fuzzy-drive-search", "files_cache.json");

      if (!existsSync(cachePath)) {
        // キャッシュがない場合はIDとURLのみ
        const infos = ids.map((id) => ({
          id,
          name: `フォルダ ${id.substring(0, 8)}...`,
          url: folderIdToUrl(id),
        }));
        setFolderInfos(infos);
        return;
      }

      const cacheContent = readFileSync(cachePath, "utf8");
      const cacheData = JSON.parse(cacheContent);

      // ファイルデータからフォルダ名を逆引き
      const folderNames: Record<string, string> = {};
      if (cacheData.files && Array.isArray(cacheData.files)) {
        cacheData.files.forEach((file: { parents?: string[]; parent_folder_name?: string }) => {
          if (file.parents && file.parent_folder_name && file.parents.length > 0) {
            const parentId = file.parents[0];
            if (ids.includes(parentId)) {
              folderNames[parentId] = file.parent_folder_name;
            }
          }
        });
      }

      const infos = ids.map((id) => ({
        id,
        name: folderNames[id] || `フォルダ ${id.substring(0, 8)}...`,
        url: folderIdToUrl(id),
      }));

      setFolderInfos(infos);
    } catch (error) {
      console.error("フォルダ名取得エラー:", error);
      // エラー時はIDとURLのみ
      const infos = ids.map((id) => ({
        id,
        name: `フォルダ ${id.substring(0, 8)}...`,
        url: folderIdToUrl(id),
      }));
      setFolderInfos(infos);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const folderIdToUrl = (folderId: string): string => {
    return `https://drive.google.com/drive/folders/${folderId}`;
  };

  const getFolderUrls = (): string[] => {
    return folderIds.map(folderIdToUrl);
  };

  return {
    folderIds,
    folderUrls: getFolderUrls(),
    folderInfos,
    isLoading,
    loadConfig,
  };
}
