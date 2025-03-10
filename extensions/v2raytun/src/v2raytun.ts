import { showToast, Toast } from "@raycast/api";
import { exec } from "child_process";

export default function main() {
  exec('open "v2raytun://connect"', (error, response) => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Ошибка подключения",
        message: error.message,
      });
      return;
    }
    showToast({
      style: Toast.Style.Success,
      title: "VPN подключен",
      message: response,
    });
  });
}
