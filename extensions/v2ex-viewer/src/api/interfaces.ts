export interface Response<T> {
  success: boolean;
  message: string;
  result?: T;
}
