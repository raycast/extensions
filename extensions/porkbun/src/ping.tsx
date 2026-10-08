import { Toast, showToast } from "@raycast/api";
import { Response } from "./utils/types";
import { ping } from "./utils/api";

export default async function Ping() {
  const response = (await ping()) as Response;
  if (response.status === "SUCCESS")
    await showToast({
      style: Toast.Style.Success,
      title: "SUCCESS!",
      message: `Your IP: ${response.yourIp}`,
    });
}
