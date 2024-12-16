import { AI, environment, List, ActionPanel, Action } from "@raycast/api";

interface RaycastProCheckProps {
  children: React.ReactNode;
}

export default function RaycastProCheck({ children }: RaycastProCheckProps) {
  // 临时修改：强制显示提示页面
  const hasAccess = false;
  // const hasAccess = environment.canAccess(AI);

  if (!hasAccess) {
    return (
      <List>
        <List.Item
          title="需要 Raycast Pro"
          subtitle="升级后即可使用 AI 功能和更多高级特性"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="升级到 Raycast Pro"
                url="https://www.raycast.com/pro?via=feng"
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return <>{children}</>;
} 