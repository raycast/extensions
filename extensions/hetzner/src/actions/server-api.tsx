import { Alert, Toast, confirmAlert, showToast } from "@raycast/api";
import {
  HetznerActionResponseData,
  HetznerServer,
  HetznerServerPageMetaData,
  HetznerStatus,
  UpdateServerStatus,
} from "../models/server";
import axios, { AxiosRequestConfig } from "axios";
import { getConfig } from "../config";
import { Project } from "../models/project";

async function handleServerStatusChange(
  project: Project,
  server: HetznerServer,
  { action }: HetznerActionResponseData,
  finalState: HetznerStatus,
  updateStatus: UpdateServerStatus,
) {
  if (action.error !== null) {
    await showToast({
      style: Toast.Style.Failure,
      title: action.error.code,
      message: action.error.message,
    });
    return;
  }

  if (action.status === "error") {
    await showToast({
      style: Toast.Style.Failure,
      title: "Server action failed!",
    });
    return;
  }

  if (action.status === "success") {
    updateStatus(server.id, finalState);

    await showToast({
      style: Toast.Style.Success,
      title: `Server ${server.name} (${server.public_net.ipv4.ip}) was changed to ${finalState}.`,
    });
    return;
  }

  let currentInterval = 0;
  const interval = setInterval(async () => {
    currentInterval++;
    const data = await getServer(project, server);
    updateStatus(server.id, data.status);

    if (currentInterval >= 15) {
      updateStatus(server.id, "unknown");
      clearInterval(interval);
      await showToast({
        style: Toast.Style.Failure,
        title: "Server action failed!",
      });
      return;
    }

    if (data.status === finalState) {
      clearInterval(interval);
      await showToast({
        style: Toast.Style.Success,
        title: `Server ${server.name} (${server.public_net.ipv4.ip}) was changed to ${finalState}.`,
      });
    }
  }, 1000);
}

export async function getServer(
  project: Project,
  server: HetznerServer,
): Promise<HetznerServer> {
  const { apiURL } = getConfig();

  const config: AxiosRequestConfig = {
    headers: { Authorization: `Bearer ${project.accessToken}` },
  };

  const response = await axios.get(`${apiURL}/v1/servers/${server.id}`, config);

  return response.data.server;
}

export async function getAllServers(
  project: Project,
): Promise<HetznerServer[]> {
  const allServers: HetznerServer[] = [];
  let pageMetaData: HetznerServerPageMetaData = {
    previous_page: null,
    next_page: 1,
    page: 0,
  };
  const { apiURL } = getConfig();

  const config: AxiosRequestConfig = {
    headers: { Authorization: `Bearer ${project.accessToken}` },
  };

  while (pageMetaData.next_page !== null) {
    const url = new URL(`${apiURL}/v1/servers`);
    url.searchParams.append("sort", "created:desc");
    url.searchParams.append("per_page", "50");
    url.searchParams.append("page", (pageMetaData.page + 1).toString());

    try {
      const response = await axios.get(url.toString(), config);
      pageMetaData = response.data.meta.pagination;

      const servers: HetznerServer[] = response.data.servers;

      // Get current price for used datacenter
      for (const server of servers) {
        server.usedPrice = server.server_type.prices?.find(
          (price) => price.location === server.datacenter.location.name,
        );

        if (server.usedPrice) {
          server.usedPrice.price_monthly.gross = Number.parseFloat(
            server.usedPrice.price_monthly.gross,
          ).toFixed(2);
        }
      }

      allServers.push(...servers);
    } catch (error) {
      pageMetaData.next_page = null;
      await showToast({
        style: Toast.Style.Failure,
        title: "Loading servers failed!",
        message: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return allServers;
}

export async function startServer(
  project: Project,
  server: HetznerServer,
  updateStatus: UpdateServerStatus,
): Promise<void> {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: `Server action will be executed.`,
    });

    const { apiURL } = getConfig();

    const config: AxiosRequestConfig = {
      headers: { Authorization: `Bearer ${project.accessToken}` },
    };

    const { data } = await axios.post<HetznerActionResponseData>(
      `${apiURL}/v1/servers/${server.id}/actions/poweron`,
      {},
      config,
    );

    await handleServerStatusChange(
      project,
      server,
      data,
      "running",
      updateStatus,
    );
  } catch (e) {
    console.error(e);
    await showToast({
      style: Toast.Style.Failure,
      title: "Server action failed!",
      message: e instanceof Error ? e.message : undefined,
    });
  }
}

export async function stopServer(
  project: Project,
  server: HetznerServer,
  updateStatus: UpdateServerStatus,
): Promise<void> {
  if (
    await confirmAlert({
      title: "Power off",
      message:
        "Are you sure you want to power off this server? \n This will do a hard shutdown of your server, the same as pulling a power cord. This action may cause data loss.",
      primaryAction: {
        title: "Power off",
        style: Alert.ActionStyle.Destructive,
      },
    })
  ) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: `Server action will be executed.`,
      });

      const { apiURL } = getConfig();

      const config: AxiosRequestConfig = {
        headers: { Authorization: `Bearer ${project.accessToken}` },
      };

      const { data } = await axios.post<HetznerActionResponseData>(
        `${apiURL}/v1/servers/${server.id}/actions/poweroff`,
        {},
        config,
      );

      await handleServerStatusChange(
        project,
        server,
        data,
        "off",
        updateStatus,
      );
    } catch (e) {
      console.error(e);
      await showToast({
        style: Toast.Style.Failure,
        title: "Server action failed!",
        message: e instanceof Error ? e.message : undefined,
      });
    }
  }
}

export async function rebootServer(
  project: Project,
  server: HetznerServer,
  updateStatus: UpdateServerStatus,
): Promise<void> {
  if (
    await confirmAlert({
      title: "Are you sure?",
      primaryAction: {
        title: "Reboot Server",
        style: Alert.ActionStyle.Destructive,
      },
    })
  ) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: `Server action will be executed.`,
      });

      const { apiURL } = getConfig();

      const config: AxiosRequestConfig = {
        headers: { Authorization: `Bearer ${project.accessToken}` },
      };

      const { data } = await axios.post<HetznerActionResponseData>(
        `${apiURL}/v1/servers/${server.id}/actions/reboot`,
        {},
        config,
      );

      await handleServerStatusChange(
        project,
        server,
        data,
        "running",
        updateStatus,
      );
    } catch (e) {
      console.error(e);
      await showToast({
        style: Toast.Style.Failure,
        title: "Server action failed!",
        message: e instanceof Error ? e.message : undefined,
      });
    }
  }
}

export async function shutdownServer(
  project: Project,
  server: HetznerServer,
  updateStatus: UpdateServerStatus,
): Promise<void> {
  if (
    await confirmAlert({
      title: "Shutdown",
      message:
        '"Shutdown" will send an ACPI signal to your server. If your server is using a standard configuration, it will do a soft shutdown. \n Please note that we still have to bill powered off servers. See docs for details.',
      primaryAction: {
        title: "Shutdown",
        style: Alert.ActionStyle.Destructive,
      },
    })
  ) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: `Server action will be executed.`,
      });

      const { apiURL } = getConfig();

      const config: AxiosRequestConfig = {
        headers: { Authorization: `Bearer ${project.accessToken}` },
      };

      const { data } = await axios.post<HetznerActionResponseData>(
        `${apiURL}/v1/servers/${server.id}/actions/shutdown`,
        {},
        config,
      );

      await handleServerStatusChange(
        project,
        server,
        data,
        "off",
        updateStatus,
      );
    } catch (e) {
      console.error(e);
      await showToast({
        style: Toast.Style.Failure,
        title: "Server action failed!",
        message: e instanceof Error ? e.message : undefined,
      });
    }
  }
}
