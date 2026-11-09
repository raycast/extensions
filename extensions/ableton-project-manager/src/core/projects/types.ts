export type Project = {
  id: string;
  title: string;
  folderPath: string;
  createdAt: number;
  inode: number; // 文件夹 inode：改名/移动/进出废纸篓不变，复制出来的文件夹不同
  modifiedAt: number;
  stageId: string | null;
  genreIds: string[];
  collectionIds: string[];
  notes: string;
  lyrics: string; // 和 notes 一样在加载时读入，已去掉 frontmatter；渲染时不再读文件
  pinned: boolean;
  pinOrder: number | null;
  setsCount: number;
  bouncesCount: number;
  // 外部 bounce 来源（绝对路径），由元数据套用；loadProjects 阶段默认为空。
  externalBounceFolders: string[];
  externalBounceFiles: string[];
};
