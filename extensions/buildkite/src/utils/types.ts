export interface Pager<T> {
  edges: {
    node: T;
  }[];
}
