import {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  AdminGetUserCommand,
  AdminListGroupsForUserCommand,
  AdminRemoveUserFromGroupCommand,
  AdminResetUserPasswordCommand,
  AttributeType,
  DescribeUserPoolCommand,
  GroupType,
  ListGroupsCommand,
  ListUserPoolsCommand,
  ListUsersCommand,
  SchemaAttributeType,
  UserPoolDescriptionType,
  UserPoolType,
  UserType,
} from "@aws-sdk/client-cognito-identity-provider";
import { showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getAWSErrorMessage } from "../errors";
import { getCognitoClient } from "../services/clients/cognito";
import { isReadyToFetch } from "../util";

/**
 * Hook to fetch all Cognito user pools in the current AWS account
 * @returns Object containing userPools array, error state, loading state, and revalidate function
 */
export function useCognitoUserPools() {
  const {
    data: userPools,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async () => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Loading user pools" });
      return await fetchUserPools(toast);
    },
    [],
    { execute: isReadyToFetch(), failureToastOptions: { title: "Failed to load user pools" } },
  );

  return { userPools, error, isLoading: (!userPools && !error) || isLoading, revalidate };
}

async function fetchUserPools(toast: Toast, maxResults = 60): Promise<UserPoolDescriptionType[]> {
  const client = getCognitoClient();
  const pools: UserPoolDescriptionType[] = [];
  let nextToken: string | undefined;

  do {
    const { UserPools, NextToken } = await client.send(
      new ListUserPoolsCommand({ MaxResults: 60, NextToken: nextToken }),
    );

    if (UserPools) {
      pools.push(...UserPools);
    }

    toast.message = `${pools.length} pools`;
    nextToken = NextToken;
  } while (nextToken && pools.length < maxResults);

  toast.style = Toast.Style.Success;
  toast.title = "Loaded user pools";
  toast.message = `${pools.length} pools`;
  return pools;
}

/**
 * Hook to fetch detailed configuration for a specific user pool
 * @param userPoolId - The ID of the user pool
 * @returns Object containing pool details, error state, and loading state
 */
export function useCognitoUserPoolDetails(userPoolId: string) {
  const {
    data: pool,
    error,
    isLoading,
  } = useCachedPromise(
    async (poolId: string) => {
      const client = getCognitoClient();
      const { UserPool } = await client.send(new DescribeUserPoolCommand({ UserPoolId: poolId }));
      return UserPool;
    },
    [userPoolId],
    {
      execute: isReadyToFetch() && !!userPoolId,
      failureToastOptions: { title: "Failed to load pool details" },
    },
  );

  return { pool, error, isLoading: (!pool && !error) || isLoading };
}

/**
 * Helper to determine if a user pool uses email as username
 */
export function poolUsesEmailAsUsername(pool: UserPoolType | undefined): boolean {
  return pool?.UsernameAttributes?.includes("email") ?? false;
}

/**
 * Helper to determine if a user pool uses phone as username
 */
export function poolUsesPhoneAsUsername(pool: UserPoolType | undefined): boolean {
  return pool?.UsernameAttributes?.includes("phone_number") ?? false;
}

/**
 * Custom attribute info for form display
 */
export interface CustomAttributeInfo {
  name: string;
  displayName: string;
  required: boolean;
  mutable: boolean;
  attributeDataType: string;
}

/**
 * Helper to get custom attributes from pool schema
 * Custom attributes are those starting with "custom:"
 */
export function getCustomAttributes(pool: UserPoolType | undefined): CustomAttributeInfo[] {
  if (!pool?.SchemaAttributes) return [];

  return pool.SchemaAttributes.filter((attr): attr is SchemaAttributeType & { Name: string } =>
    Boolean(attr.Name?.startsWith("custom:")),
  ).map((attr) => ({
    name: attr.Name,
    displayName: attr.Name.replace("custom:", ""),
    required: attr.Required ?? false,
    mutable: attr.Mutable ?? true,
    attributeDataType: attr.AttributeDataType ?? "String",
  }));
}

/**
 * Hook to fetch users in a specific Cognito user pool
 * @param userPoolId - The ID of the user pool
 * @param filter - Optional filter string (e.g., "email ^= \"john\"")
 * @returns Object containing users array, error state, loading state, and revalidate function
 */
export function useCognitoUsers(userPoolId: string, filter?: string) {
  const {
    data: users,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (poolId: string, filterStr?: string) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Loading users" });
      return await fetchUsers(poolId, toast, filterStr);
    },
    [userPoolId, filter],
    {
      execute: isReadyToFetch() && !!userPoolId,
      failureToastOptions: { title: "Failed to load users" },
    },
  );

  return { users, error, isLoading: (!users && !error) || isLoading, revalidate };
}

async function fetchUsers(userPoolId: string, toast: Toast, filter?: string, maxResults = 60): Promise<UserType[]> {
  const client = getCognitoClient();
  const users: UserType[] = [];
  let paginationToken: string | undefined;

  do {
    const { Users, PaginationToken } = await client.send(
      new ListUsersCommand({
        UserPoolId: userPoolId,
        ...(filter && { Filter: filter }),
        PaginationToken: paginationToken,
        Limit: 60,
      }),
    );

    if (Users) {
      users.push(...Users);
    }

    toast.message = `${users.length} users`;
    paginationToken = PaginationToken;
  } while (paginationToken && users.length < maxResults);

  toast.style = Toast.Style.Success;
  toast.title = "Loaded users";
  toast.message = `${users.length} users`;
  return users;
}

/**
 * Hook to fetch detailed information for a specific user
 * @param userPoolId - The ID of the user pool
 * @param username - The username of the user
 * @returns Object containing user details, error state, and loading state
 */
export function useCognitoUserDetails(userPoolId: string, username: string) {
  const {
    data: user,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (poolId: string, name: string) => {
      const client = getCognitoClient();
      const response = await client.send(new AdminGetUserCommand({ UserPoolId: poolId, Username: name }));
      return response;
    },
    [userPoolId, username],
    {
      execute: isReadyToFetch() && !!userPoolId && !!username,
      failureToastOptions: { title: "Failed to load user details" },
    },
  );

  return { user, error, isLoading: (!user && !error) || isLoading, revalidate };
}

/**
 * Hook to fetch all groups in a user pool
 * @param userPoolId - The ID of the user pool
 * @returns Object containing groups array, error state, loading state, and revalidate function
 */
export function useCognitoGroups(userPoolId: string) {
  const {
    data: groups,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (poolId: string) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Loading groups" });
      return await fetchGroups(poolId, toast);
    },
    [userPoolId],
    {
      execute: isReadyToFetch() && !!userPoolId,
      failureToastOptions: { title: "Failed to load groups" },
    },
  );

  return { groups, error, isLoading: (!groups && !error) || isLoading, revalidate };
}

async function fetchGroups(userPoolId: string, toast: Toast, maxResults = 60): Promise<GroupType[]> {
  const client = getCognitoClient();
  const groups: GroupType[] = [];
  let nextToken: string | undefined;

  do {
    const { Groups, NextToken } = await client.send(
      new ListGroupsCommand({ UserPoolId: userPoolId, NextToken: nextToken, Limit: 60 }),
    );

    if (Groups) {
      groups.push(...Groups);
    }

    toast.message = `${groups.length} groups`;
    nextToken = NextToken;
  } while (nextToken && groups.length < maxResults);

  toast.style = Toast.Style.Success;
  toast.title = "Loaded groups";
  toast.message = `${groups.length} groups`;
  return groups;
}

/**
 * Hook to fetch groups for a specific user
 * @param userPoolId - The ID of the user pool
 * @param username - The username of the user
 * @returns Object containing groups array, error state, and loading state
 */
export function useCognitoUserGroups(userPoolId: string, username: string) {
  const {
    data: groups,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (poolId: string, name: string) => {
      const client = getCognitoClient();
      const groups: GroupType[] = [];
      let nextToken: string | undefined;

      do {
        const { Groups, NextToken } = await client.send(
          new AdminListGroupsForUserCommand({
            UserPoolId: poolId,
            Username: name,
            NextToken: nextToken,
            Limit: 60,
          }),
        );

        if (Groups) {
          groups.push(...Groups);
        }

        nextToken = NextToken;
      } while (nextToken);

      return groups;
    },
    [userPoolId, username],
    {
      execute: isReadyToFetch() && !!userPoolId && !!username,
      failureToastOptions: { title: "Failed to load user groups" },
    },
  );

  return { groups, error, isLoading: (!groups && !error) || isLoading, revalidate };
}

// Action functions for user management

export interface CreateUserInput {
  username: string;
  email?: string;
  phoneNumber?: string;
  temporaryPassword?: string;
  sendInvitation?: boolean;
  customAttributes?: Record<string, string>;
}

/**
 * Creates a new user in a Cognito user pool
 * @param userPoolId - The ID of the user pool
 * @param userData - User data including username, email, phone, and optional password
 * @returns Promise resolving to the created user
 */
export async function createCognitoUser(userPoolId: string, userData: CreateUserInput): Promise<UserType | undefined> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Creating user",
    message: userData.username,
  });

  try {
    const client = getCognitoClient();
    const userAttributes: AttributeType[] = [];

    if (userData.email) {
      userAttributes.push({ Name: "email", Value: userData.email });
      userAttributes.push({ Name: "email_verified", Value: "true" });
    }
    if (userData.phoneNumber) {
      userAttributes.push({ Name: "phone_number", Value: userData.phoneNumber });
      userAttributes.push({ Name: "phone_number_verified", Value: "true" });
    }

    // Add custom attributes
    if (userData.customAttributes) {
      for (const [name, value] of Object.entries(userData.customAttributes)) {
        if (value) {
          userAttributes.push({ Name: name, Value: value });
        }
      }
    }

    const { User } = await client.send(
      new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: userData.username,
        UserAttributes: userAttributes.length > 0 ? userAttributes : undefined,
        TemporaryPassword: userData.temporaryPassword,
        MessageAction: userData.sendInvitation === false ? "SUPPRESS" : undefined,
        ForceAliasCreation: false,
      }),
    );

    toast.style = Toast.Style.Success;
    toast.title = "User created";
    toast.message = userData.username;
    return User;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to create user";
    toast.message = getAWSErrorMessage(error);
    throw error;
  }
}

/**
 * Enables a user in a Cognito user pool
 * @param userPoolId - The ID of the user pool
 * @param username - The username to enable
 */
export async function enableCognitoUser(userPoolId: string, username: string): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Enabling user",
    message: username,
  });

  try {
    const client = getCognitoClient();
    await client.send(new AdminEnableUserCommand({ UserPoolId: userPoolId, Username: username }));

    toast.style = Toast.Style.Success;
    toast.title = "User enabled";
    toast.message = username;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to enable user";
    toast.message = getAWSErrorMessage(error);
    throw error;
  }
}

/**
 * Disables a user in a Cognito user pool
 * @param userPoolId - The ID of the user pool
 * @param username - The username to disable
 */
export async function disableCognitoUser(userPoolId: string, username: string): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Disabling user",
    message: username,
  });

  try {
    const client = getCognitoClient();
    await client.send(new AdminDisableUserCommand({ UserPoolId: userPoolId, Username: username }));

    toast.style = Toast.Style.Success;
    toast.title = "User disabled";
    toast.message = username;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to disable user";
    toast.message = getAWSErrorMessage(error);
    throw error;
  }
}

/**
 * Resets a user's password, triggering a password reset flow
 * @param userPoolId - The ID of the user pool
 * @param username - The username whose password to reset
 */
export async function resetCognitoUserPassword(userPoolId: string, username: string): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Resetting password",
    message: username,
  });

  try {
    const client = getCognitoClient();
    await client.send(new AdminResetUserPasswordCommand({ UserPoolId: userPoolId, Username: username }));

    toast.style = Toast.Style.Success;
    toast.title = "Password reset initiated";
    toast.message = "User will receive a reset code";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to reset password";
    toast.message = getAWSErrorMessage(error);
    throw error;
  }
}

/**
 * Deletes a user from a Cognito user pool
 * @param userPoolId - The ID of the user pool
 * @param username - The username to delete
 */
export async function deleteCognitoUser(userPoolId: string, username: string): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Deleting user",
    message: username,
  });

  try {
    const client = getCognitoClient();
    await client.send(new AdminDeleteUserCommand({ UserPoolId: userPoolId, Username: username }));

    toast.style = Toast.Style.Success;
    toast.title = "User deleted";
    toast.message = username;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to delete user";
    toast.message = getAWSErrorMessage(error);
    throw error;
  }
}

/**
 * Adds a user to a group
 * @param userPoolId - The ID of the user pool
 * @param username - The username to add to the group
 * @param groupName - The name of the group
 */
export async function addCognitoUserToGroup(userPoolId: string, username: string, groupName: string): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Adding to group",
    message: `${username} -> ${groupName}`,
  });

  try {
    const client = getCognitoClient();
    await client.send(
      new AdminAddUserToGroupCommand({
        UserPoolId: userPoolId,
        Username: username,
        GroupName: groupName,
      }),
    );

    toast.style = Toast.Style.Success;
    toast.title = "Added to group";
    toast.message = `${username} -> ${groupName}`;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to add to group";
    toast.message = getAWSErrorMessage(error);
    throw error;
  }
}

/**
 * Removes a user from a group
 * @param userPoolId - The ID of the user pool
 * @param username - The username to remove from the group
 * @param groupName - The name of the group
 */
export async function removeCognitoUserFromGroup(
  userPoolId: string,
  username: string,
  groupName: string,
): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Removing from group",
    message: `${username} <- ${groupName}`,
  });

  try {
    const client = getCognitoClient();
    await client.send(
      new AdminRemoveUserFromGroupCommand({
        UserPoolId: userPoolId,
        Username: username,
        GroupName: groupName,
      }),
    );

    toast.style = Toast.Style.Success;
    toast.title = "Removed from group";
    toast.message = `${username} <- ${groupName}`;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to remove from group";
    toast.message = getAWSErrorMessage(error);
    throw error;
  }
}

/**
 * Helper function to get user attribute value
 * @param attributes - Array of user attributes
 * @param name - Name of the attribute to find
 * @returns The attribute value or undefined
 */
export function getUserAttribute(attributes: AttributeType[] | undefined, name: string): string | undefined {
  return attributes?.find((attr) => attr.Name === name)?.Value;
}
