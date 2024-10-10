export type Memo = {
  name: string;
  uid: string;
  content: string;
};

export interface MemoListProps {
  memos: Memo[];
}
