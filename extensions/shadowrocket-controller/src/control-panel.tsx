import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import {
  connectVpn,
  disconnectVpn,
  routeModes,
  ShadowrocketActionPanel,
  toggleVpn,
} from "./lib/shadowrocket";

export default function Command() {
  return (
    <List searchBarPlaceholder="搜索 Shadowrocket 操作或路由...">
      <List.Section title="VPN">
        <List.Item
          title="切换 VPN"
          subtitle="发送 shadowrocket://toggle"
          icon={{ source: Icon.Power, tintColor: Color.Green }}
          actions={
            <ActionPanel>
              <Action title="切换 VPN" icon={Icon.Power} onAction={toggleVpn} />
              <Action title="打开 VPN" icon={Icon.Play} onAction={connectVpn} />
              <Action
                title="关闭 VPN"
                icon={Icon.Stop}
                onAction={disconnectVpn}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="打开 VPN"
          subtitle="发送 shadowrocket://connect"
          icon={{ source: Icon.Play, tintColor: Color.Blue }}
          actions={
            <ActionPanel>
              <Action title="打开 VPN" icon={Icon.Play} onAction={connectVpn} />
            </ActionPanel>
          }
        />
        <List.Item
          title="关闭 VPN"
          subtitle="发送 shadowrocket://disconnect"
          icon={{ source: Icon.Stop, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action
                title="关闭 VPN"
                icon={Icon.Stop}
                onAction={disconnectVpn}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="全局路由">
        {routeModes.map((routeMode) => (
          <List.Item
            key={routeMode.id}
            title={routeMode.title}
            subtitle={routeMode.subtitle}
            icon={{ source: routeMode.icon, tintColor: routeMode.tintColor }}
            actions={<ShadowrocketActionPanel routeMode={routeMode.id} />}
          />
        ))}
      </List.Section>
    </List>
  );
}
