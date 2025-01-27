export type ResponseStatus = {
  code: number;
  message: string;
};

export type Response = {
  status: ResponseStatus;

  headers: Record<string, string>;
  body: string;

  created: Date;
};
