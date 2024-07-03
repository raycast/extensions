import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import fetch, { FormData } from "node-fetch";
import { ServerHookType, ServerType } from "../type/server";
import { GetApiKey, GetDefaultServer } from "../type/config";

export function useServer(): ServerHookType {
  const [data, setData] = useState<ServerType[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);

  const localStorageName = "servers";

  useEffect(() => {
    (async () => {
      const stored = await LocalStorage.getItem<string>(localStorageName);
      if (stored) {
        setData((previous) => [...previous, ...JSON.parse(stored)]);
      } else {
        await apiLoadCollection(setData, data);
      }

      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    LocalStorage.setItem(localStorageName, JSON.stringify(data));
  }, [data]);

  const reload = useCallback(async () => {
    await apiLoadCollection(setData, data);

    await showToast({
      title: "Server data realoaded!",
      style: Toast.Style.Success,
    });
  }, [setData, data]);

  const update = useCallback(
    async (item: ServerType) => {
      setData((prev) => {
        return prev.map((v: ServerType) => {
          if (v.server_id === item.server_id) {
            return item;
          }

          return v;
        });
      });

      await showToast({
        title: "Server updated!",
        style: Toast.Style.Success,
      });
    },
    [setData, data],
  );

  const detail = useCallback(
    async (server: ServerType) => {
      const d = await apiServerLoadDetail(server);

      setData((prev) => {
        return prev.map((x) => {
          if (x.server_id === d.server_id) {
            return d;
          }
          return x;
        });
      });
    },
    [setData, data],
  );

  const itemRestart = useCallback(
    async (server: ServerType) => {
      await apiRestart(server);

      await showToast({
        title: "Server restarted!",
        style: Toast.Style.Success,
      });
    },
    [setData, data],
  );

  const itemAmfetamine = useCallback(
    async (server: ServerType) => {
      await apiAmfetamine(server);

      await showToast({
        title: "Server amfetamine!",
        style: Toast.Style.Success,
      });
    },
    [setData, data],
  );

  return useMemo(
    () => ({ data, isLoading, reload, update, detail, itemRestart, itemAmfetamine }),
    [data, isLoading, reload, update, detail, itemRestart, itemAmfetamine],
  );
}

async function apiServerLoadDetail(server: ServerType): Promise<ServerType> {
  const formdata = new FormData();
  formdata.append("srv", server.server_id);
  formdata.append("key", server.apiKey ? server.apiKey : GetApiKey());

  const info = await fetch("https://api.mikr.us/info", {
    method: "POST",
    body: formdata,
  })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .then(async (response: any) => response.json())
    .catch((err) => {
      console.log(err);
    });

  const logs = await fetch("https://api.mikr.us/logs", {
    method: "POST",
    body: formdata,
  })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .then(async (response: any) => response.json())
    .catch((err) => {
      console.log(err);
    });

  const ports = await fetch("https://api.mikr.us/porty", {
    method: "POST",
    body: formdata,
  })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .then(async (response: any) => response.json())
    .catch((err) => {
      console.log(err);
    });

  const clouds = await fetch("https://api.mikr.us/cloud", {
    method: "POST",
    body: formdata,
  })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .then(async (response: any) => response.json())
    .catch((err) => {
      console.log(err);
    });

  if (!info.error) {
    server.info = info;
  }
  if (!logs.error) {
    server.logs = logs;
  }
  if (!ports.error) {
    server.ports = ports;
  }
  if (!clouds.error) {
    server.clouds = clouds;
  }

  return server;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function apiLoadCollection(setData: any, oldData: ServerType[]) {
  const formdata = new FormData();
  formdata.append("srv", GetDefaultServer());
  formdata.append("key", GetApiKey());

  await fetch("https://api.mikr.us/serwery", {
    method: "POST",
    body: formdata,
  })
    .then(async (response) => response.json())
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .then(async (res: any) => {
      if (res.error) {
        console.log(res);
        return;
      }

      const newRes: ServerType[] = res.map((item: ServerType) => {
        const existing = oldData.find((x: ServerType) => x.server_id === item.server_id);
        return {
          ...item,
          apiKey: existing?.apiKey,
        };
      });

      setData(newRes);
    })
    .catch((err) => {
      console.log(err);
    });
}

async function apiRestart(server: ServerType) {
  const formdata = new FormData();
  formdata.append("srv", server.server_id);
  formdata.append("key", server.apiKey ? server.apiKey : GetApiKey());

  await fetch("https://api.mikr.us/restart", {
    method: "POST",
    body: formdata,
  })
    .then(async (response) => response.json())
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .then(async (res: any) => {
      if (res.error) {
        console.log(res);
        return;
      }
    })
    .catch((err) => {
      console.log(err);
    });
}

async function apiAmfetamine(server: ServerType) {
  const formdata = new FormData();
  formdata.append("srv", server.server_id);
  formdata.append("key", server.apiKey ? server.apiKey : GetApiKey());

  await fetch("https://api.mikr.us/amfetamina", {
    method: "POST",
    body: formdata,
  })
    .then(async (response) => response.json())
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .then(async (res: any) => {
      if (res.error) {
        console.log(res);
        return;
      }
    })
    .catch((err) => {
      console.log(err);
    });
}
