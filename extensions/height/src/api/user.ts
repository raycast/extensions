import fetch from "node-fetch";
import { getOAuthToken } from "../components/withHeightAuth";
import { UserObject } from "../types/user";
import { ApiErrorResponse, ApiResponse } from "../types/utils";
import { ApiUrls } from "./helpers";

export const ApiUser = {
  async get() {
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
  },
  async getMe() {
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
  },
};
