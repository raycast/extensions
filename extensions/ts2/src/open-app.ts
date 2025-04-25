import { showToast, Toast, getPreferenceValues, open } from "@raycast/api";

interface Preferences {
  application: {
    path: string;
    name: string;
  };
}

export default async function Command() {
  try {
    // 获取用户在设置中选择的应用
    const { application } = getPreferenceValues<Preferences>();

    if (!application) {
      await showToast({
        style: Toast.Style.Failure,
        title: "未设置应用",
        message: "请在插件设置中选择一个应用",
      });
      return;
    }

    // 打开应用
    await open(application.path);

    await showToast({
      style: Toast.Style.Success,
      title: `已打开应用：${application.name}`,
    });
  } catch (error) {
    console.error("打开应用失败:", error);

    await showToast({
      style: Toast.Style.Failure,
      title: "打开应用失败",
      message: String(error),
    });
  }
}
