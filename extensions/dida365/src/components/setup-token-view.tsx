import { Action, ActionPanel, Detail, Icon, Keyboard, openExtensionPreferences } from "@raycast/api";
import { DIDA_SETTINGS_URL } from "../setup.js";

export function SetupTokenView() {
  return (
    <Detail
      markdown={`# 设置滴答清单 API 口令

第一次使用前，需要先在滴答清单网页版生成 API 口令，然后粘贴到 Raycast 扩展设置里。

1. 打开滴答清单网页版设置。
2. 在左侧选择 **账户与安全**。
3. 向下滚动到 **API 口令**。
4. 点击右侧 **管理**，生成并复制口令。
5. 回到 Raycast 扩展设置，粘贴到 **Dida365 API Token**。

![API Token Guide](api-token-guide.jpg)
`}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open Dida365 Settings"
            icon={Icon.Globe}
            url={DIDA_SETTINGS_URL}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
          <Action
            title="Open Extension Preferences"
            icon={Icon.Gear}
            shortcut={Keyboard.Shortcut.Common.OpenWith}
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    />
  );
}
