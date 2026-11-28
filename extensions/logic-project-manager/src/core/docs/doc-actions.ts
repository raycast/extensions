import { docSharedWith, type DocKind } from "./docs";
import { strings } from "@/strings";

/** 详情面板没有内容时的占位：文件夹失效则显示警告，否则显示"还没有笔记/歌词"。
 *  missingFolder 由调用方用 useMissingDocFolders 算好：这里不读磁盘，渲染路径才能保持纯函数。 */
export function docPlaceholder(kind: DocKind, title: string | undefined, missingFolder: string | null): string {
  const others = title ? docSharedWith(title, kind) : [];
  if (others.length > 0) {
    return `**${strings.docShared}**\n\n${strings.docSharedHint.replace("{names}", others.join(", "))}`;
  }
  if (missingFolder) {
    return `**⚠️ ${strings.docFolderMissing}**\n\n\`${missingFolder}\`\n\n${strings.docFolderMissingHint}`;
  }
  return kind === "notes" ? strings.noNotesYet : strings.noLyricsYet;
}
