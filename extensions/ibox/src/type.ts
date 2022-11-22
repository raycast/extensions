export type Item = {
  content: string;
  label: string;
};

export type BaseListData<T> = {
  // 列表
  list: T[];

  // 总条数
  total: number;
};

export type ResData<D> = {
  code: number;
  msg?: string;
  data: D;
};

export enum AsyncStatus {
  none,
  pending,
  success,
  error,
}
