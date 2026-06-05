import {
  Action,
  ActionPanel,
  captureException,
  Color,
  Icon,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { execFile } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";

export type RouteMode = "proxy" | "config" | "direct" | "scene";

export type RouteModeDefinition = {
  id: RouteMode;
  title: string;
  subtitle: string;
  icon: Icon;
  tintColor: Color;
  successTitle: string;
};

export const routeModes: RouteModeDefinition[] = [
  {
    id: "proxy",
    title: "全局代理 (Proxy)",
    subtitle: "所有流量走当前节点",
    icon: Icon.Globe,
    tintColor: Color.Blue,
    successTitle: "已请求切换到全局代理",
  },
  {
    id: "config",
    title: "配置/规则 (Config)",
    subtitle: "按配置文件规则分流",
    icon: Icon.BulletPoints,
    tintColor: Color.Green,
    successTitle: "已请求切换到配置模式",
  },
  {
    id: "direct",
    title: "直连 (Direct)",
    subtitle: "所有流量直连，不走代理",
    icon: Icon.ArrowRight,
    tintColor: Color.Orange,
    successTitle: "已请求切换到直连模式",
  },
  {
    id: "scene",
    title: "场景 (Scene)",
    subtitle: "使用 Shadowrocket 的场景规则",
    icon: Icon.Layers,
    tintColor: Color.Purple,
    successTitle: "已请求切换到场景模式",
  },
];

const schemeStepDelayMs = 450;
const runFile = promisify(execFile);

export function buildUrl(command: string): string {
  return `shadowrocket://${command}`;
}

export function buildRouteUrl(mode: RouteMode): string {
  return buildUrl(`route/${mode}`);
}

export async function sendShadowrocketUrls(
  urls: string[],
  successTitle: string,
): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "正在发送到 Shadowrocket",
    message: urls.length === 1 ? urls[0] : `${urls.length} 个指令`,
  });

  try {
    for (const [index, url] of urls.entries()) {
      await runFile("/usr/bin/open", ["-g", url]);
      if (index < urls.length - 1) {
        await delay(schemeStepDelayMs);
      }
    }

    toast.style = Toast.Style.Success;
    toast.title = "已发送到 Shadowrocket";
    toast.message = undefined;
    await showHUD(successTitle);
  } catch (error) {
    captureException(error);
    toast.style = Toast.Style.Failure;
    toast.title = "Shadowrocket 指令发送失败";
    toast.message =
      "确认已安装 Shadowrocket，且系统能打开 shadowrocket:// URL。";
  }
}

export async function toggleVpn(): Promise<void> {
  await sendShadowrocketUrls(
    [buildUrl("toggle")],
    "已请求切换 Shadowrocket VPN",
  );
}

export async function connectVpn(): Promise<void> {
  await sendShadowrocketUrls(
    [buildUrl("connect")],
    "已请求打开 Shadowrocket VPN",
  );
}

export async function disconnectVpn(): Promise<void> {
  await sendShadowrocketUrls(
    [buildUrl("disconnect")],
    "已请求关闭 Shadowrocket VPN",
  );
}

export async function setRouteMode(mode: RouteMode): Promise<void> {
  const modeDefinition = routeModes.find((routeMode) => routeMode.id === mode);
  await sendShadowrocketUrls(
    [buildRouteUrl(mode)],
    modeDefinition?.successTitle ?? "已请求切换路由模式",
  );
}

export function ShadowrocketActionPanel(props: { routeMode?: RouteMode }) {
  return (
    <ActionPanel>
      {props.routeMode ? (
        <ActionPanel.Section title="路由">
          <Action
            title="设置此路由模式"
            icon={Icon.CheckCircle}
            onAction={() => setRouteMode(props.routeMode as RouteMode)}
          />
        </ActionPanel.Section>
      ) : null}

      <ActionPanel.Section title="VPN">
        <Action title="切换 VPN" icon={Icon.Power} onAction={toggleVpn} />
        <Action
          title="打开 VPN"
          icon={Icon.Play}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={connectVpn}
        />
        <Action
          title="关闭 VPN"
          icon={Icon.Stop}
          shortcut={{ modifiers: ["cmd"], key: "x" }}
          onAction={disconnectVpn}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="路由模式">
        {routeModes.map((routeMode) => (
          <Action
            key={routeMode.id}
            title={routeMode.title}
            icon={routeMode.icon}
            onAction={() => setRouteMode(routeMode.id)}
          />
        ))}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
