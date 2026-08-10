import { useState, useEffect } from "react";
import { ActionPanel, Action, List, showToast, Toast, Color, Icon, LocalStorage, closeMainWindow } from "@raycast/api";
import { exec } from "child_process";

type App = {
  name: string;
  keep: boolean;
  always_keep: boolean;
};

async function toggleAppInPresetKeepApps(appName: string) {
  // 尝试从LocalStorage中读取presetKeepApps
  const presetKeepAppsStr = await LocalStorage.getItem<string>("presetKeepApps");
  let presetKeepApps = presetKeepAppsStr ? JSON.parse(presetKeepAppsStr) : [];

  // 检查appName是否已经存在于列表中
  if (presetKeepApps.includes(appName)) {
    // 如果存在，则从列表中删除
    presetKeepApps = presetKeepApps.filter((app: string) => app !== appName);
    console.log(`Removed ${appName} from presetKeepApps.`);
  } else {
    // 如果不存在，则添加到列表中
    presetKeepApps.push(appName);
    console.log(`Added ${appName} to presetKeepApps.`);
  }

  // 保存更新后的列表到LocalStorage
  await LocalStorage.setItem("presetKeepApps", JSON.stringify(presetKeepApps));
}

export default function Command() {
  const [apps, setApps] = useState<App[]>([]);
  const [isLoading, setIsLoading] = useState(true); // 添加isLoading状态
  apps.sort((a, b) => (a.keep === b.keep ? 0 : a.keep ? -1 : 1));

  // 获取已打开的应用程序列表
  useEffect(() => {
    // 首先获取预设保留的应用程序列表
    const getPresetKeepApps = async () => {
      const presetKeepAppsStr = await LocalStorage.getItem<string>("presetKeepApps");
      const presetKeepApps = presetKeepAppsStr ? JSON.parse(presetKeepAppsStr) : [];
      return presetKeepApps;
    };

    // 然后获取系统中的应用程序列表，并设置keep和always_keep属性
    const fetchApps = async () => {
      setIsLoading(true); // 开始加载，设置isLoading为true
      const presetKeepApps = await getPresetKeepApps();
      exec(
        `osascript -e 'tell application "System Events" to get name of (processes where background only is false)'`,
        (err, stdout) => {
          setIsLoading(false); // 加载完成，设置isLoading为false
          if (err) {
            showToast({ title: "Error fetching apps", message: err.message, style: Toast.Style.Failure });
            return;
          }

          const appNames = stdout.split(", ");
          const apps = appNames
            .map((name) => ({
              name,
              keep: false, // 默认不保留
              always_keep: presetKeepApps.includes(name), // 如果在预设列表中，则always_keep为true
            }))
            .sort((a, b) => (a.keep === b.keep ? 0 : a.keep ? -1 : 1));
          setApps(apps);
        },
      );
    };

    fetchApps();
  }, []);

  // 更改应用程序的保留状态
  const toggleKeepApp = (appName: string) => {
    const updatedApps = apps.map((app) => {
      if (app.name === appName) {
        return { ...app, keep: !app.keep }; // 切换keep状态
      }
      return app;
    });
    setApps(updatedApps);
  };

  // 当修改默认值时更新app.always_keep值
  const handleToggleAlwaysKeepApp = async (appName: string) => {
    // 首先，切换presetKeepApps中的状态
    await toggleAppInPresetKeepApps(appName);

    // 然后，更新apps数组
    const updatedApps = apps.map((app) => {
      if (app.name === appName) {
        // 切换app的always_keep状态
        return { ...app, always_keep: !app.always_keep };
      }
      return app;
    });

    // 最后，使用更新后的apps数组更新状态
    setApps(updatedApps);
  };

  // 关闭程序（Finder 使用kill命令是关不掉的）
  const closeApps = async () => {
    const presetKeepAppsStr = await LocalStorage.getItem<string>("presetKeepApps");
    const presetKeepApps = presetKeepAppsStr ? JSON.parse(presetKeepAppsStr) : [];
    apps.forEach((app) => {
      if (!app.keep && !presetKeepApps.includes(app.name)) {
        // 使用trim()方法移除appName两端的空白符
        const trimmedAppName = app.name.trim();
        exec(`pgrep -x "${trimmedAppName}"`, (err, stdout, stderr) => {
          if (err || stderr) {
            console.error(`Failed to find ${trimmedAppName}: ${err || stderr}`);
            return;
          }
          const pid = stdout.trim();
          if (pid) {
            exec(`kill -9 ${pid}`, (killErr, _, killStderr) => {
              if (killErr || killStderr) {
                console.error(`Failed to force close ${trimmedAppName}: ${killErr || killStderr}`);
              } else {
                console.log(`${trimmedAppName} was forced to close.`);
              }
            });
          }
        });
      }
    });
    closeMainWindow();
  };

  const alwaysKeepApps = apps.filter((app) => app.always_keep);
  const otherApps = apps.filter((app) => !app.always_keep);

  return (
    <List isLoading={isLoading}>
      <List.Section title="App List">
        {otherApps.map((app, index) => (
          <List.Item
            key={`other-${index}`}
            title={app.name}
            icon={app.keep ? Icon.Checkmark : Icon.Circle} // 其他应用根据keep状态选择图标
            accessories={[
              ...(app.keep ? [{ tag: { value: "Keep", color: Color.Orange } }] : []),
              ...(app.always_keep ? [{ tag: { value: "Always Keep", color: Color.Green } }] : []), // 实际上这行会始终为false并可以移除
              // ...(app.keep ? [{ icon: Icon.CircleFilled }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action icon={{ source: Icon.Check }} title="Set Keep" onAction={() => toggleKeepApp(app.name)} />
                <Action
                  icon={{ source: Icon.Lock }}
                  title="Set Always Keep"
                  onAction={() => handleToggleAlwaysKeepApp(app.name)}
                />
                <Action
                  icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
                  title="Close Other Apps"
                  onAction={() => closeApps()}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {alwaysKeepApps.length > 0 && (
        <List.Section title="Always Keep Apps">
          {alwaysKeepApps.map((app, index) => (
            <List.Item
              key={`always-${index}`}
              title={app.name}
              icon={Icon.Checkmark} // 默认保留的应用使用Checkmark图标
              accessories={[...(app.always_keep ? [{ tag: { value: "Always Keep", color: Color.Red } }] : [])]}
              actions={
                <ActionPanel>
                  <Action
                    icon={{ source: Icon.LockDisabled }}
                    title="Clear Always Keep"
                    onAction={() => handleToggleAlwaysKeepApp(app.name)}
                  />
                  <Action
                    icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
                    title="Close Other Apps"
                    onAction={() => closeApps()}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
