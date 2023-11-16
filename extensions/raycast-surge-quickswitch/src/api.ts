import axios from "axios";

export default function (xKey: string, port: string) {
  const api = axios.create({
    baseURL: `http://${xKey}@127.0.0.1:${port}`,
    headers: { "X-Key": xKey },
  });

  function changeSystemProxyStatus(status: boolean) {
    return api({
      method: "post",
      url: "/v1/features/system_proxy",
      data: { enabled: status },
    });
  }

  function changeEnhancedMode(status: boolean) {
    return api({
      method: "post",
      url: "/v1/features/enhanced_mode",
      data: { enabled: status },
    });
  }

  return {
    enableSurge() {
      changeSystemProxyStatus(true);
      changeEnhancedMode(true);
    },

    disableSurge() {
      changeSystemProxyStatus(false);
      changeEnhancedMode(false);
    },
  };
}
