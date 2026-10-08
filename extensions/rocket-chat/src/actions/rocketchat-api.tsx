import { Channel, DirectMessage, Team, User, UserStatus } from "../models/user";
import { getConfig } from "../config";
import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { open, showToast, Toast } from "@raycast/api";

export async function createDirectMessage(user: User) {
  const { baseUrl, userId, accessToken } = getConfig();

  const config: AxiosRequestConfig = {
    headers: {
      "X-Auth-Token": accessToken,
      "X-User-Id": userId,
    },
  };

  const url = new URL(`${baseUrl}/api/v1/im.create`);

  const response = await axios.post(
    url.toString(),
    {
      username: user.username,
    },
    config,
  );

  await open(`${baseUrl}/direct/${response.data.room.rid}`);
}

export async function getDirectoryList<T extends "teams" | "channels">(
  type: T,
): Promise<T extends "teams" ? Team[] : Channel[]> {
  const { baseUrl, userId, accessToken } = getConfig();

  const config: AxiosRequestConfig = {
    headers: {
      "X-Auth-Token": accessToken,
      "X-User-Id": userId,
    },
  };

  try {
    const getList = async function* () {
      const count = 50;
      let offset = 0;
      let totalCount = -1; /* -1 signifies failure */

      while (offset === 0 || offset < totalCount) {
        const url = new URL(`${baseUrl}/api/v1/directory`);

        url.searchParams.append("query", `{"type": "${type}"}`);
        url.searchParams.append("count", count.toString());
        url.searchParams.append("offset", offset.toString());

        const response = await axios.get(url.toString(), config);

        offset = response.data.offset + response.data.count;
        totalCount = response.data.total;

        yield response.data.result;
      }
    };

    const result = [];

    for await (const item of getList()) {
      result.push(...item);
    }

    return result;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Loading ${type} failed!`,
      message: error instanceof Error ? error.message : undefined,
    });

    if (error instanceof AxiosError && error.response?.status === 401) {
      return [];
    }

    throw error;
  }
}

export async function getStatus(userId: string): Promise<UserStatus> {
  const { baseUrl, accessToken } = getConfig();

  const config: AxiosRequestConfig = {
    headers: {
      "X-Auth-Token": accessToken,
      "X-User-Id": userId,
    },
  };

  try {
    const url = new URL(`${baseUrl}/api/v1/users.getStatus`);

    url.searchParams.append("userId", userId);

    const response = await axios.get(url.toString(), config);

    return response.data.status;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Fetching user status failed!",
      message: error instanceof Error ? error.message : undefined,
    });

    throw error;
  }
}

export async function setStatus(status: UserStatus, callback: (status: UserStatus) => void): Promise<void> {
  const { baseUrl, userId, accessToken } = getConfig();

  const config: AxiosRequestConfig = {
    headers: {
      "X-Auth-Token": accessToken,
      "X-User-Id": userId,
    },
  };

  try {
    const url = new URL(`${baseUrl}/api/v1/users.setStatus`);

    const response = await axios.post(
      url.toString(),
      {
        message: "My status update",
        status,
      },
      config,
    );

    if (response.data["success"]) {
      callback(status);

      return;
    }

    await showToast({
      style: Toast.Style.Failure,
      title: "Setting user status failed!",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Setting user status failed!",
      message: error instanceof Error ? error.message : undefined,
    });

    throw error;
  }
}

export async function getCurrentUser(): Promise<User> {
  const { baseUrl, userId, accessToken } = getConfig();

  const config: AxiosRequestConfig = {
    headers: {
      "X-Auth-Token": accessToken,
      "X-User-Id": userId,
    },
  };

  try {
    const url = new URL(`${baseUrl}/api/v1/users.info`);

    url.searchParams.append("userId", userId);

    const response = await axios.get(url.toString(), config);

    return response.data.user;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Loading users failed!",
      message: error instanceof Error ? error.message : undefined,
    });

    throw error;
  }
}

export async function getDirectMessageList(): Promise<DirectMessage[]> {
  const { baseUrl, userId, accessToken } = getConfig();

  const config: AxiosRequestConfig = {
    headers: {
      "X-Auth-Token": accessToken,
      "X-User-Id": userId,
    },
  };

  try {
    const getList = async function* () {
      const count = 100;
      let offset = 0;
      let totalCount = -1; /* -1 signifies failure */

      while (offset === 0 || offset < totalCount) {
        const url = new URL(`${baseUrl}/api/v1/im.list`);

        url.searchParams.append("sort", '{ "lm": -1 }');
        url.searchParams.append("count", count.toString());
        url.searchParams.append("offset", offset.toString());

        const response = await axios.get(url.toString(), config);

        offset = response.data.offset + response.data.count;
        totalCount = response.data.total;

        yield response.data.ims;
      }
    };

    const result: DirectMessage[] = [];

    for await (const item of getList()) {
      result.push(...item);
    }

    return result;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Loading direct messages failed!",
      message: error instanceof Error ? error.message : undefined,
    });

    if (error instanceof AxiosError && error.response?.status === 401) {
      return [];
    }

    throw error;
  }
}

export async function getUserList(): Promise<User[]> {
  const { baseUrl, userId, accessToken } = getConfig();

  const config: AxiosRequestConfig = {
    headers: {
      "X-Auth-Token": accessToken,
      "X-User-Id": userId,
    },
  };

  try {
    const getList = async function* () {
      const count = 100;
      let offset = 0;
      let totalCount = -1; /* -1 signifies failure */

      while (offset === 0 || offset < totalCount) {
        const url = new URL(`${baseUrl}/api/v1/users.list`);

        url.searchParams.append("count", count.toString());
        url.searchParams.append("offset", offset.toString());

        const response = await axios.get(url.toString(), config);

        offset = response.data.offset + response.data.count;
        totalCount = response.data.total;

        yield response.data.users;
      }
    };

    const result: User[] = [];

    for await (const item of getList()) {
      result.push(...item);
    }

    return result;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Loading direct messages failed!",
      message: error instanceof Error ? error.message : undefined,
    });

    if (error instanceof AxiosError && error.response?.status === 401) {
      return [];
    }

    throw error;
  }
}
