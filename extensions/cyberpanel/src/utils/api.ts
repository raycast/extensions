import { Toast, showToast } from "@raycast/api";
import {
  ErrorResponse,
  RequestBody,
  SuccessResponse,
  VerifyLoginResponse,
} from "./types";
import fetch from "node-fetch";
import { API_HEADERS, API_URL } from "./constants";
import { ChangeUserACLRequest, ChangeUserACLResponse, CreateUserRequest, CreateUserResponse, DeleteUserRequest, DeleteUserResponse, ListUsersResponse, ModifyUserRequest, ModifyUserResponse } from "../types/users";

const callApi = async (endpoint: string, animatedToastMessage = "", body?: RequestBody) => {
  await showToast(Toast.Style.Animated, "Processing...", animatedToastMessage);

  const apiResponse = await fetch(API_URL, { headers: API_HEADERS, method: "POST", body: JSON.stringify({
    serverUserName: "admin",
    controller: endpoint,
    ...body
  }) });

  if (!apiResponse.ok) {
    const { status } = apiResponse;
    const error = `${status} Error`;

    const response = { error_message: error } as ErrorResponse;

    return response;
  } else {
    
    const response = (await apiResponse.json()) as ErrorResponse | SuccessResponse;
    
    if ("error_message" in response) {
      if (response.error_message!=="None") {
        await showToast(Toast.Style.Failure, "Error", response.error_message);
      }
    }
    
    return response;
  }
};

export async function verifyLogin() {
  return (await callApi("verifyLogin", "Verifying Login")) as
    | ErrorResponse
    | VerifyLoginResponse;
}

// Users
export async function listUsers() {
  return (await callApi("fetchUsers", "Fetching Users")) as
    | ErrorResponse
    | ListUsersResponse;
}
export async function createUser(body: CreateUserRequest) {
  return (await callApi("submitUserCreation", "Creating User", body)) as
    | ErrorResponse
    | CreateUserResponse;
}
export async function modifyUser(body: ModifyUserRequest) {
  return (await callApi("saveModificationsUser", "Modifying User", body)) as
    | ErrorResponse
    | ModifyUserResponse;
}
export async function changeUserACL(body: ChangeUserACLRequest) {
  return (await callApi("changeACLFunc", "Changing User ACL", body)) as
    | ErrorResponse
    | ChangeUserACLResponse;
}
export async function deleteUser(body: DeleteUserRequest) {
  return (await callApi("submitUserDeletion", "Deleting User", body)) as
    | ErrorResponse
    | DeleteUserResponse;
}