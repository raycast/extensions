import { showToast, Toast } from "@raycast/api";
import { useWPCOMClient } from "../helpers/withWPCOMClient";

export async function fetchPMAToken(siteId: number) {
  if (!siteId) {
    return "";
  }
  const { wp } = useWPCOMClient();
  try {
    const { token }: { token?: string } = await wp.req.post({
      path: `/sites/${siteId}/hosting/pma/token`,
      apiNamespace: "wpcom/v2",
    });

    if (token) {
      return token;
    } else {
      return "";
    }
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to fetch phpMyAdmin token",
    });
    return "";
  }
}

export async function getEdgeCacheStatus(siteId: number) {
  if (!siteId) {
    return null;
  }
  const { wp } = useWPCOMClient();
  try {
    const active: boolean = await wp.req.get({
      path: `/sites/${siteId}/hosting/edge-cache/active`,
      apiNamespace: "wpcom/v2",
    });
    return active;
  } catch (e) {
    await showToast({
      style: Toast.Style.Success,
      title: "Failed to fetch edge cache status.",
    });
    return null;
  }
}

export async function setEdgeCache(siteId: number, active: boolean) {
  if (!siteId) {
    return null;
  }
  const { wp } = useWPCOMClient();
  try {
    const newStatus: boolean = await wp.req.post({
      path: `/sites/${siteId}/hosting/edge-cache/active`,
      apiNamespace: "wpcom/v2",
      body: {
        active,
      },
    });
    return newStatus;
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to update edge cache.",
    });
    return null;
  }
}

export async function clearEdgeCache(siteId: number) {
  if (!siteId) {
    return null;
  }
  const { wp } = useWPCOMClient();
  try {
    const newStatus: boolean = await wp.req.post({
      path: `/sites/${siteId}/hosting/edge-cache/purge`,
      apiNamespace: "wpcom/v2",
    });
    return newStatus;
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to clear cache.",
    });
    return null;
  }
}

export async function clearWordPressCache(siteId: number, reason: string) {
  if (!siteId) {
    return null;
  }
  const { wp } = useWPCOMClient();
  try {
    const newStatus: boolean = await wp.req.post({
      path: `/sites/${siteId}/hosting/clear-cache`,
      apiNamespace: "wpcom/v2",
      body: {
        reason,
      },
    });
    return newStatus;
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to clear cache.",
    });
    return null;
  }
}
