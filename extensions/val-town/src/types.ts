export type Profile = {
  id: string;
  username: string;
  bio?: string | null;
  profileImageUrl?: string;
};

export type Val = {
  id: string;
  author: Pick<Profile, "id" | "username">;
  name: string;
  code: string;
  privacy: string;
  public: boolean;
  version: number;
  runStartAt: Date;
  runEndAt: Date;
  logs: [];
  output: {
    type: string;
    value: any;
  };
  error: string | null;
  readme: string | null;
  likeCount: number;
  referenceCount: number;
};
export type UserVal = Pick<
  Val,
  "id" | "name" | "code" | "privacy" | "public" | "version" | "runStartAt" | "runEndAt"
> & {
  author: Pick<Profile, "id" | "username">;
};

export type RunVal = Pick<
  Val,
  "id" | "name" | "code" | "privacy" | "public" | "version" | "runStartAt" | "runEndAt"
> & {
  author: Pick<Profile, "id" | "username">;
  author_id: string;
  username: string;
};

export type Run = {
  id: string;
  error: string | null;
  parentId: string;
  runStartAt: Date;
  runEndAt: Date;
  val: RunVal;
};
