type PostType = Record<string, unknown>;
export declare const request: ({
  method,
  data,
  url,
}: {
  method: string;
  data?: PostType;
  url?: string;
}) => Promise<unknown>;
export declare const get: (url?: string) => Promise<unknown>;
export declare const post: (data: PostType, url?: string) => Promise<unknown>;
export {};
