export type UmamiMe = {
  id: string;
  username: string;
  role: string;
  createdAt: string;
  isAdmin: boolean;
};
export type UmamiUpdateMyPassword = {
  currentPassword: string;
  newPassword: string;
};

// Websites
export type AddWebsiteFormValues = {
  domain: string;
  name: string;
  // shareId?: string;
  // teamId?: string;
};
export type UmamiWebsite = {
  id: string;
  name: string;
  domain: string;
  //   shareId: string | null,
  //   resetAt: null,
  //   websiteId: string;
  //   createdAt: string;
  //   updatedAt: string | null;
  //   deletedAt: string | null;
};

// type UmamiPagedData<T> = {
//     data: T[];
//     count: number;
//     page: number;
//     pageSize: number;
//     orderBy: string;
// }
export type UmamiResponse<T> = {
  ok: boolean;
  status: number;
  data?: T;
  // error?: any;
  // data: UmamiPagedData<T> | T;
  error?: unknown;
};

export type UmamiErrorResponse = { error: { message: string; code: string; status: number } };
