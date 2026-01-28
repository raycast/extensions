export interface MergeArguments {
  mergeNum: string;
  mergeOrder: string;
}
export enum MergeNum {
  ONE = "1",
  TWO = "2",
  THREE = "3",
  FOUR = "4",
  FIVE = "5",
}

export enum MergeOrder {
  FORWARD_ORDER = "Forward",
  REVERSE_ORDER = "Backward",
}
