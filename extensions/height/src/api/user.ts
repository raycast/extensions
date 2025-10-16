import fetch from "node-fetch";

import { ApiUrls } from "@/api/helpers";
import { getOAuthToken } from "@/components/withHeightAuth";
import { UserObject } from "@/types/user";
import { ApiErrorResponse, ApiResponse } from "@/types/utils";

export async function getUser() {
  const response = await fetch(ApiUrls.users, {
    headers: {
      Authorization: `Bearer ${getOAuthToken()}`,
      "Content-Type": "application/json",
    },
  });

  if (response.ok) {
    return (await response.json()) as ApiResponse<UserObject[]>;
  } else {
    throw new Error(((await response.json()) as ApiErrorResponse).error.message);
  }
}

export async function getMe() {
  const response = await fetch(ApiUrls.usersMe, {
    headers: {
      Authorization: `Bearer ${getOAuthToken()}`,
      "Content-Type": "application/json",
    },
  });

  if (response.ok) {
    return (await response.json()) as UserObject;
  } else {
    throw new Error(((await response.json()) as ApiErrorResponse).error.message);
  }
}
