import rclone from "./rclone";

export async function fetchRemoteConfig(name: string) {
  return await rclone("/config/get", {
    params: { query: { name } },
  });
}

export async function fetchRemoteList() {
  return await rclone("/config/listremotes");
}

export async function fetchConfigDump() {
  return await rclone("/config/dump");
}

export async function fetchOptionsInfo() {
  return await rclone("/options/info");
}

export async function fetchGlobalOptions() {
  return await rclone("/options/get");
}

export async function fetchPid() {
  return await rclone("/core/pid");
}

export async function fetchMounts() {
  return await rclone("/mount/listmounts");
}
