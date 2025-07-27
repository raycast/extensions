import { promises as fs } from "fs";
import * as path from "path";
import * as os from "os";

/**
 * ファイル操作のユーティリティ関数
 */

/**
 * チルダ（~）で始まるパスをホームディレクトリに展開
 * @param filePath - 展開するパス
 * @returns 展開されたパス
 */
export const expandTildePath = (filePath: string): string => {
  if (filePath.startsWith("~/")) {
    return path.join(os.homedir(), filePath.slice(2));
  }
  if (filePath === "~") {
    return os.homedir();
  }
  return filePath;
};

/**
 * ファイルが存在するかチェック
 * @param filePath - チェックするファイルのパス
 * @returns ファイルが存在する場合true
 */
export const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

/**
 * ディレクトリを再帰的に作成
 * @param dirPath - 作成するディレクトリのパス
 */
export const ensureDirectory = async (dirPath: string): Promise<void> => {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code !== "EEXIST") {
      throw error;
    }
  }
};

/**
 * ファイルを読み取り
 * @param filePath - 読み取るファイルのパス
 * @returns ファイルの内容
 */
export const readFile = async (filePath: string): Promise<string> => {
  return await fs.readFile(filePath, "utf-8");
};

/**
 * ファイルに書き込み
 * @param filePath - 書き込むファイルのパス
 * @param content - 書き込む内容
 */
export const writeFile = async (
  filePath: string,
  content: string,
): Promise<void> => {
  // ディレクトリが存在しない場合は作成
  const dirPath = path.dirname(filePath);
  await ensureDirectory(dirPath);

  await fs.writeFile(filePath, content, "utf-8");
};

/**
 * ファイルの指定セクションの後に内容を追加
 * @param filePath - 対象ファイルのパス
 * @param sectionHeader - セクションヘッダー（例: "## Journal"）
 * @param content - 追加する内容
 * @param considerSubsections - サブセクションも考慮するか
 * @param createIfNotFound - セクションが見つからない場合に作成するか
 * @param insertPosition - セクションが見つからない場合の挿入位置（'top' | 'bottom'）
 */
export const appendToSection = async (
  filePath: string,
  sectionHeader: string,
  content: string,
  considerSubsections: boolean = true,
  createIfNotFound: boolean = true,
  insertPosition: "top" | "bottom" = "bottom",
): Promise<void> => {
  let fileContent = "";

  if (await fileExists(filePath)) {
    fileContent = await readFile(filePath);
  }

  const lines = fileContent.split("\n");
  const sectionIndex = findSectionIndex(lines, sectionHeader);

  if (sectionIndex === -1) {
    if (createIfNotFound) {
      // セクションが見つからない場合、新しく作成
      const newSection = `${sectionHeader}\n${content}`;
      if (insertPosition === "bottom") {
        if (fileContent.trim()) {
          fileContent += `\n\n${newSection}`;
        } else {
          fileContent = newSection;
        }
      } else {
        if (fileContent.trim()) {
          fileContent = `${newSection}\n\n${fileContent}`;
        } else {
          fileContent = newSection;
        }
      }
    } else {
      throw new Error(`Section "${sectionHeader}" not found in file`);
    }
  } else {
    // セクションが見つかった場合、適切な位置に挿入
    const insertIndex = findInsertPosition(
      lines,
      sectionIndex,
      considerSubsections,
    );
    lines.splice(insertIndex, 0, content);
    fileContent = lines.join("\n");
  }

  await writeFile(filePath, fileContent);
};

/**
 * ファイル内でセクションヘッダーのインデックスを見つける
 * @param lines - ファイルの行配列
 * @param sectionHeader - 探すセクションヘッダー
 * @returns セクションのインデックス（見つからない場合は-1）
 */
const findSectionIndex = (lines: string[], sectionHeader: string): number => {
  return lines.findIndex((line) => line.trim() === sectionHeader.trim());
};

/**
 * セクション内で内容を挿入する適切な位置を見つける
 * @param lines - ファイルの行配列
 * @param sectionIndex - セクションヘッダーのインデックス
 * @param considerSubsections - サブセクションも考慮するか
 * @returns 挿入位置のインデックス
 */
const findInsertPosition = (
  lines: string[],
  sectionIndex: number,
  considerSubsections: boolean,
): number => {
  const sectionLevel = getSectionLevel(lines[sectionIndex]);
  let insertIndex = lines.length;

  // セクションヘッダーの次の行から検索開始
  for (let i = sectionIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith("#")) {
      const currentLevel = getSectionLevel(line);

      if (considerSubsections) {
        // サブセクションを考慮する場合、同レベル以上のヘッダーで終了
        if (currentLevel <= sectionLevel) {
          insertIndex = i;
          break;
        }
      } else {
        // サブセクションを考慮しない場合、次のヘッダーで終了
        insertIndex = i;
        break;
      }
    }
  }

  return insertIndex;
};

/**
 * セクションヘッダーのレベルを取得（#の数）
 * @param header - セクションヘッダー
 * @returns ヘッダーレベル
 */
const getSectionLevel = (header: string): number => {
  const match = header.match(/^#+/);
  return match ? match[0].length : 0;
};
