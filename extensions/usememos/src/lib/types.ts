export type Memo = {
  name: string;
  uid: string;
  pinned: boolean;
  rowStatus: string;
  content: string;
  tags: string[];
  creator: string;
  createTime: string;
  updateTime: string;
};

export type MemoWithSummary = Memo & {
  summary: string;
};

export interface MemoListProps {
  memos: Memo[];
}
