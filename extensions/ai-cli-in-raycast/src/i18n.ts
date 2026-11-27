import { execFileSync } from "node:child_process";
import { platform } from "node:os";

export type UILanguage = "en" | "zh-CN" | "zh-TW";

let language: UILanguage = "en";
let macSystemLanguage: UILanguage | undefined;

function languageForLocale(value: string): UILanguage {
  const locale = new Intl.Locale(value);
  return locale.language === "zh"
    ? locale.maximize().script === "Hant"
      ? "zh-TW"
      : "zh-CN"
    : "en";
}

function systemLanguage(): UILanguage {
  if (platform() === "darwin") {
    if (macSystemLanguage) return macSystemLanguage;
    for (const domain of ["com.raycast.macos", "-g"]) {
      try {
        const languages = execFileSync(
          "/usr/bin/defaults",
          ["read", domain, "AppleLanguages"],
          {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
            timeout: 1000,
          },
        );
        const preferred = languages.match(
          /^\s*\(\s*"?([a-zA-Z]{2,8}(?:-[a-zA-Z0-9]{1,8})*)"?\s*[,)]/,
        );
        if (preferred)
          return (macSystemLanguage = languageForLocale(preferred[1]));
      } catch {
        // An absent app override falls through to the global language list.
      }
    }
    macSystemLanguage = languageForLocale(
      Intl.DateTimeFormat().resolvedOptions().locale,
    );
    return macSystemLanguage;
  }
  return languageForLocale(Intl.DateTimeFormat().resolvedOptions().locale);
}

/** Controls runtime UI; Raycast's host preference text is statically bilingual. */
export function setLanguage(value: unknown): UILanguage {
  if (value === "system" || value == null) {
    language = systemLanguage();
  } else {
    language = value === "zh-CN" || value === "zh-TW" ? value : "en";
  }
  return language;
}

export function uiLanguage(): UILanguage {
  return language;
}

// Keep the two Chinese variants explicit: automatic character conversion can
// change product names or technical meanings. Unknown text always stays intact.
const translations: Record<string, readonly [string, string]> = {
  "Automatic CLI detection is off. Set the {provider} CLI path in preferences.":
    [
      "自动检测已关闭，请在偏好设置中填写 {provider} CLI 的路径。",
      "自動偵測已關閉，請在偏好設定中填寫 {provider} CLI 的路徑。",
    ],
  "Unrecognized conversation format. Original records have been preserved; please do not clear extension data.":
    [
      "无法识别对话记录格式。原始记录已保留，请勿清除扩展数据。",
      "無法辨識對話記錄格式。原始記錄已保留，請勿清除擴充功能資料。",
    ],
  "Send Saved Draft: {preview}": ["发送草稿：{preview}", "傳送草稿：{preview}"],
  "Change Default Strategy": ["修改默认策略", "修改預設策略"],
  "Default strategy changed. Reopen these settings.": [
    "默认策略已变更，请重新打开此设置页。",
    "預設策略已變更，請重新開啟此設定頁。",
  ],
  "{provider} Defaults": ["{provider} 默认设置", "{provider} 預設設定"],
  "Defaults apply when opening this CLI or starting a new chat. In-chat changes are temporary and do not change a fixed default.":
    [
      "默认值用于打开此 CLI 或新建聊天。对话中的临时切换不会修改固定默认值。",
      "預設值用於開啟此 CLI 或建立新聊天。對話中的臨時切換不會修改固定預設值。",
    ],
  "Could not load default settings": ["无法读取默认设置", "無法讀取預設設定"],
  "Default Strategy": ["默认策略", "預設策略"],
  "Use Last Selection": ["沿用上次选择", "沿用上次選擇"],
  "Fixed Model and Effort": ["固定模型与强度", "固定模型與強度"],
  "Reuse this CLI's most recently selected model and effort level.": [
    "继续使用此 CLI 最近选择的模型和思考强度。",
    "繼續使用此 CLI 最近選擇的模型與思考強度。",
  ],
  "Choose a model and its supported effort level. Availability is checked again before saving; no prompt is sent.":
    [
      "选择模型及其支持的思考强度。保存前会重新检查可用选项，不发送消息。",
      "選擇模型及其支援的思考強度。儲存前會重新檢查可用選項，不傳送訊息。",
    ],
  "Choose a valid model and effort level before saving.": [
    "请选择有效的模型和思考强度后保存。",
    "請選擇有效的模型與思考強度後儲存。",
  ],
  "The fixed default is no longer available. Choose a model and effort level again.":
    [
      "固定默认值已不可用，请重新选择模型和思考强度。",
      "固定預設值已無法使用，請重新選擇模型與思考強度。",
    ],
  "Choose a fixed model and effort in CLI Settings first.": [
    "请先在 CLI 设置中选择固定模型和思考强度。",
    "請先在 CLI 設定中選擇固定模型與思考強度。",
  ],
  "Default model policy saved": ["默认策略已保存", "預設策略已儲存"],
  "Save Defaults": ["保存默认设置", "儲存預設設定"],
  "Model and Effort Defaults": ["模型与强度默认设置", "模型與強度預設設定"],
  "Loading Models…": ["正在检查模型…", "正在檢查模型…"],
  "Model List Unavailable": ["模型目录暂不可用", "模型清單暫不可用"],
  "No Models Available": ["未发现可用模型", "未找到可用模型"],
  "Not adjustable": ["不可单独调整", "無法單獨調整"],
  "View Full Conversation": ["查看完整对话", "檢視完整對話"],
  "Wait for Response": ["等待回复", "等待回覆"],
  "Keep drafting · Wait or stop, then send": [
    "可继续写草稿 · 回复结束或停止后发送",
    "可繼續寫草稿 · 回覆結束或停止後傳送",
  ],
  "Type your message above, then press Enter to send.": [
    "在上方输入消息，按 Enter 发送。",
    "在上方輸入訊息，按 Enter 傳送。",
  ],
  "Write a message, then press Enter…": [
    "输入消息，按 Enter 发送…",
    "輸入訊息，按 Enter 傳送…",
  ],
  "Multiline draft preserved": ["已保留多行草稿", "已保留多行草稿"],
  "Send the complete draft or clear it before typing a replacement.": [
    "请发送完整草稿，或清除后再输入新内容。",
    "請傳送完整草稿，或清除後再輸入新內容。",
  ],
  "Saved multiline draft": ["已保存的多行草稿", "已儲存的多行草稿"],
  "All lines are preserved. Enter sends this complete draft; Clear Draft discards it.":
    [
      "全部内容均已保留。按 Enter 发送完整草稿；“清除草稿”会将其丢弃。",
      "全部內容均已保留。按 Enter 傳送完整草稿；「清除草稿」會將其捨棄。",
    ],
  "Send Saved Multiline Draft": [
    "发送已保存的多行草稿",
    "傳送已儲存的多行草稿",
  ],
  "What would you like to work on?": ["想聊点什么？", "想聊點什麼？"],
  "Press Enter to write a message.": [
    "按 Enter 开始输入。",
    "按 Enter 開始輸入。",
  ],
  "Additional Instructions": ["补充说明", "補充說明"],
  Message: ["消息", "訊息"],
  "Write a message…": ["输入消息…", "輸入訊息…"],
  "Sending…": ["正在发送…", "正在傳送…"],
  "Edit Multiple Lines": ["编辑多行消息", "編輯多行訊息"],
  "Press Esc to return, then Enter to send. Edits are saved automatically.": [
    "按 Esc 返回，再按 Enter 发送。内容自动保存。",
    "按 Esc 返回，再按 Enter 傳送。內容自動儲存。",
  ],
  "Draft ready. Press Enter to send.": [
    "草稿已就绪，按 Enter 发送。",
    "草稿已就緒，按 Enter 傳送。",
  ],
  "Send Draft": ["发送草稿", "傳送草稿"],
  "Restore Draft": ["恢复草稿", "還原草稿"],
  "Press Enter to restore draft": ["按 Enter 恢复草稿", "按 Enter 還原草稿"],
  "{count} lines": ["{count} 行", "{count} 行"],
  "Responding…": ["正在回复…", "正在回覆…"],
  "Searching the web…": ["正在搜索…", "正在搜尋…"],
  "Running command…": ["正在执行命令…", "正在執行指令…"],
  "Calling tool…": ["正在使用工具…", "正在使用工具…"],
  "Set language, CLI detection, paths, and permissions.": [
    "设置语言、CLI 检测、路径与权限。",
    "設定語言、CLI 偵測、路徑與權限。",
  ],
  "Enable or disable commands in Raycast Settings → Extensions.": [
    "在 Raycast 设置 → 扩展中启用或停用命令。",
    "在 Raycast 設定 → 擴充功能中啟用或停用指令。",
  ],
  "A CLI was found. Sign-in is checked when you send a message.": [
    "已找到 CLI，发送消息时才会检查登录。",
    "已找到 CLI，傳送訊息時才會檢查登入。",
  ],
  "Set a CLI path in preferences, then refresh.": [
    "请在偏好设置中填写 CLI 路径，然后重新检测。",
    "請在偏好設定中填寫 CLI 路徑，然後重新偵測。",
  ],
  "No CLI was found. Set a path or install the CLI.": [
    "未找到 CLI，请设置路径或安装 CLI。",
    "未找到 CLI，請設定路徑或安裝 CLI。",
  ],
  Source: ["来源", "來源"],
  "Open {provider}": ["打开 {provider}", "開啟 {provider}"],
  "Open CLI Settings": ["打开 CLI 设置", "開啟 CLI 設定"],
  "Choose a CLI…": ["选择 CLI…", "選擇 CLI…"],
  "Could Not Open Command": ["无法打开命令", "無法開啟指令"],
  "Enable this command in Raycast Settings → Extensions, then try again.": [
    "请在 Raycast 设置 → 扩展中启用此命令后重试。",
    "請在 Raycast 設定 → 擴充功能中啟用此指令後重試。",
  ],
  "Could Not Detect CLIs": ["无法检测 CLI", "無法偵測 CLI"],
  "Connect CLI": ["连接 CLI", "連線至 CLI"],
  "Check the CLI and available models. No message is sent.": [
    "检查 CLI 与可用模型，此步骤不会发送消息。",
    "檢查 CLI 與可用模型，此步驟不會傳送訊息。",
  ],
  "Check the CLI and available models. Sign-in is verified with your first message.":
    [
      "检查 CLI 与可用模型；发送第一条消息时才会验证登录。",
      "檢查 CLI 與可用模型；傳送第一則訊息時才會驗證登入。",
    ],
  "Default Model": ["默认模型", "預設模型"],
  "Choose the model for new messages.": [
    "选择新消息使用的模型。",
    "選擇新訊息使用的模型。",
  ],
  "Choose a model. CLI Default uses the CLI's own choice.": [
    "选择模型，或选“CLI 默认”使用 CLI 自身的选择。",
    "選擇模型，或選「CLI 預設」使用 CLI 自身的選擇。",
  ],
  "Press Enter to open the message composer.": [
    "按 Enter 打开输入框。",
    "按 Enter 開啟輸入框。",
  ],
  "Checking…": ["正在检查…", "正在檢查…"],
  Found: ["已找到", "已找到"],
  "Path required": ["需要设置路径", "需要設定路徑"],
  "Check configured path": ["请检查所设置的路径", "請檢查所設定的路徑"],
  "Not found": ["未找到", "未找到"],
  "Language and CLI Preferences": [
    "语言与 CLI 偏好设置",
    "語言與 CLI 偏好設定",
  ],
  "Detect CLIs Again": ["重新检测 CLI", "重新偵測 CLI"],
  "AI CLI in Raycast Settings": [
    "AI CLI in Raycast 设置",
    "AI CLI in Raycast 設定",
  ],
  "Find a CLI or setting…": ["查找 CLI 或设置…", "尋找 CLI 或設定…"],
  Preferences: ["偏好设置", "偏好設定"],
  "Choose your interface language, automatic CLI detection, custom paths, working directory, and Codex permissions in extension preferences.":
    [
      "在扩展偏好设置中选择界面语言、CLI 自动检测、自定义路径、工作目录与 Codex 权限。",
      "在擴充功能偏好設定中選擇介面語言、CLI 自動偵測、自訂路徑、工作目錄與 Codex 權限。",
    ],
  "Each CLI has its own command, conversations, and model choice. Enable or disable individual commands in Raycast Settings → Extensions → AI CLI in Raycast.":
    [
      "每个 CLI 都有独立命令、对话与模型选择。在 Raycast 设置 → 扩展 → AI CLI in Raycast 中分别启用或停用。",
      "每個 CLI 都有獨立指令、對話與模型選擇。在 Raycast 設定 → 擴充功能 → AI CLI in Raycast 中分別啟用或停用。",
    ],
  "Leave a CLI path empty to detect it automatically. A custom path always takes priority. With automatic detection turned off, enter a path for each CLI you use.":
    [
      "CLI 路径留空即可自动检测，自定义路径始终优先。关闭自动检测时，请为需要使用的每个 CLI 填写路径。",
      "CLI 路徑留空即可自動偵測，自訂路徑一律優先。關閉自動偵測時，請為需要使用的每個 CLI 填寫路徑。",
    ],
  "Detection checks installation paths. Sign-in and model access are confirmed when you send a message.":
    [
      "检测仅检查安装路径。登录与模型访问权限会在发送消息时确认。",
      "偵測僅檢查安裝路徑。登入與模型存取權限會在傳送訊息時確認。",
    ],
  "Installed CLIs": ["本机 CLI", "本機 CLI"],
  "Custom path": ["自定义路径", "自訂路徑"],
  "Automatic detection": ["自动检测", "自動偵測"],
  "CLI found. Sign-in and model access have not been checked.": [
    "已找到 CLI，尚未检查登录与模型访问权限。",
    "已找到 CLI，尚未檢查登入與模型存取權限。",
  ],
  "Automatic detection is off. Add this CLI's path in extension preferences.": [
    "自动检测已关闭，请在扩展偏好设置中填写此 CLI 的路径。",
    "自動偵測已關閉，請在擴充功能偏好設定中填寫此 CLI 的路徑。",
  ],
  "Install this CLI, or set its executable or Node entrypoint path in extension preferences. Refresh after making changes.":
    [
      "请安装此 CLI，或在扩展偏好设置中填写可执行文件或 Node 入口路径。更改后重新检测。",
      "請安裝此 CLI，或在擴充功能偏好設定中填寫執行檔或 Node 進入點路徑。變更後重新偵測。",
    ],
  "Checking installation paths…": ["正在检查安装路径…", "正在檢查安裝路徑…"],
  "CLI Path": ["CLI 路径", "CLI 路徑"],
  "Node.js Runtime": ["Node.js 运行环境", "Node.js 執行環境"],
  "Configured Path": ["所设置的路径", "所設定的路徑"],
  "Detection Details": ["检测详情", "偵測詳情"],
  Checked: ["检查时间", "檢查時間"],
  "Copy CLI Path": ["复制 CLI 路径", "複製 CLI 路徑"],
  "Could Not Switch CLI": ["无法切换 CLI", "無法切換 CLI"],
  "Enable this command in Raycast Settings → Extensions → AI CLI in Raycast.": [
    "请在 Raycast 设置 → 扩展 → AI CLI in Raycast 中启用此命令。",
    "請在 Raycast 設定 → 擴充功能 → AI CLI in Raycast 中啟用此指令。",
  ],
  Retry: ["重试", "重試"],
  "Connecting to {provider}…": [
    "正在连接 {provider}…",
    "正在連線至 {provider}…",
  ],
  "Could not save conversation: {error}": [
    "无法保存对话：{error}",
    "無法儲存對話：{error}",
  ],
  "Could not save model selection": ["无法保存模型选择", "無法儲存模型選擇"],
  "CLI Default": ["CLI 默认", "CLI 預設"],
  "Use Current Conversation Model": [
    "使用当前对话的模型",
    "使用目前對話的模型",
  ],
  "Used for the next reply; steering the current response will still use the original model.":
    [
      "将用于下一次回复；补充当前回复的指令仍使用原模型。",
      "將用於下一次回覆；補充目前回覆的指令仍使用原模型。",
    ],
  "This setting applies to the next message.": [
    "此设置应用于下一条消息。",
    "此設定套用至下一則訊息。",
  ],
  "Thinking · Press Enter to steer": [
    "思考中 · 按 Enter 补充指令",
    "思考中 · 按 Enter 補充指令",
  ],
  "Thinking · You can stop the response": [
    "思考中 · 可停止回复",
    "思考中 · 可停止回覆",
  ],
  "Searching the web · Can still steer": [
    "正在搜索网页 · 可补充指令",
    "正在搜尋網頁 · 可補充指令",
  ],
  "Running command · Can stop or steer": [
    "正在执行命令 · 可停止或补充指令",
    "正在執行指令 · 可停止或補充指令",
  ],
  "Calling tool · Can still steer": [
    "正在调用工具 · 可补充指令",
    "正在呼叫工具 · 可補充指令",
  ],
  "Responding · Press Enter to steer": [
    "回复中 · 按 Enter 补充指令",
    "回覆中 · 按 Enter 補充指令",
  ],
  "Responding · You can stop the response": [
    "回复中 · 可停止回复",
    "回覆中 · 可停止回覆",
  ],
  "Response failed. You can retry": ["回复失败，可重试", "回覆失敗，可重試"],
  "Stopped · Press Enter to continue chatting": [
    "已停止 · 按 Enter 继续对话",
    "已停止 · 按 Enter 繼續對話",
  ],
  "Completed · Press Enter to continue chatting": [
    "已完成 · 按 Enter 继续对话",
    "已完成 · 按 Enter 繼續對話",
  ],
  "{provider} returned an error": [
    "{provider} 返回错误",
    "{provider} 傳回錯誤",
  ],
  "This action requires interactive confirmation, which is not automatically authorized in this interface. Please stop this turn and continue this session in the Codex CLI.":
    [
      "此操作需要交互确认，本界面不会自动授权。请停止当前回复，然后在 Codex CLI 中继续此会话。",
      "此操作需要互動確認，本介面不會自動授權。請停止目前回覆，然後在 Codex CLI 中繼續此工作階段。",
    ],
  "{provider} connection closed. Please reconnect.": [
    "{provider} 连接已关闭，请重新连接。",
    "{provider} 連線已關閉，請重新連線。",
  ],
  "Connection closed": ["连接已关闭", "連線已關閉"],
  "Previous conversation could not be restored and has been kept in history: {error}":
    [
      "无法恢复上一段对话，已保留在历史记录中：{error}",
      "無法還原上一段對話，已保留在歷史記錄中：{error}",
    ],
  "Connected · Press Enter to send": [
    "已连接 · 按 Enter 发送",
    "已連線 · 按 Enter 傳送",
  ],
  "Connection failed": ["连接失败", "連線失敗"],
  "Service not connected. Please reopen the command.": [
    "服务尚未连接，请重新打开命令。",
    "服務尚未連線，請重新開啟指令。",
  ],
  "Wait for the current reply or stop it before sending another message.": [
    "请等待当前回复完成，或停止后再发送消息。",
    "請等待目前回覆完成，或停止後再傳送訊息。",
  ],
  "Steer sent": ["已发送补充指令", "已傳送補充指令"],
  "The selected model or effort level is no longer available. Please reselect a model in Actions at the bottom.":
    [
      "所选模型或思考强度已不可用，请在底部操作菜单中重新选择。",
      "所選模型或思考強度已無法使用，請在底部動作選單中重新選擇。",
    ],
  "Failed to send": ["发送失败", "傳送失敗"],
  "Wait for the Reply or Stop It First": [
    "请等待回复完成或先停止",
    "請等待回覆完成或先停止",
  ],
  "Service not connected": ["服务尚未连接", "服務尚未連線"],
  'Text has been preserved. Please wait for connection or click "Reconnect".': [
    "文字已保留，请等待连接完成或点击“重新连接”。",
    "文字已保留，請等待連線完成或點擊「重新連線」。",
  ],
  "Please stop the current response first": [
    "请先停止当前回复",
    "請先停止目前回覆",
  ],
  "New Chat · Press Enter to send": [
    "新对话 · 按 Enter 发送",
    "新對話 · 按 Enter 傳送",
  ],
  "You can switch conversations after stopping.": [
    "停止后即可切换对话。",
    "停止後即可切換對話。",
  ],
  "Service not connected. Please return to chat and reconnect.": [
    "服务尚未连接，请返回对话并重新连接。",
    "服務尚未連線，請返回對話並重新連線。",
  ],
  "Session restored · Press Enter to continue chatting": [
    "会话已恢复 · 按 Enter 继续对话",
    "工作階段已還原 · 按 Enter 繼續對話",
  ],
  "Could not open conversation": ["无法打开对话", "無法開啟對話"],
  "Install Codex CLI": ["安装 Codex CLI", "安裝 Codex CLI"],
  "Stop Response": ["停止回复", "停止回覆"],
  "Stopping…": ["正在停止…", "正在停止…"],
  "Recent Chats": ["最近的对话", "最近的對話"],
  "Copy Response": ["复制回复", "複製回覆"],
  "Copy Current Conversation": ["复制当前对话", "複製目前對話"],
  "CLI and Default Model": ["CLI 与默认模型", "CLI 與預設模型"],
  "Open Settings": ["打开设置", "開啟設定"],
  "CLI Settings": ["CLI 设置", "CLI 設定"],
  "Could Not Open CLI Settings": ["无法打开 CLI 设置", "無法開啟 CLI 設定"],
  "Stop the Current Reply First": ["请先停止当前回复", "請先停止目前回覆"],
  "Could Not Save Conversation": ["无法保存对话", "無法儲存對話"],
  "New Chat": ["新对话", "新對話"],
  Reconnect: ["重新连接", "重新連線"],
  "No models returned. Check your CLI configuration and try again.": [
    "未获取到模型，请检查 CLI 配置后重试。",
    "未取得模型，請檢查 CLI 設定後重試。",
  ],
  "Choose a model and effort level to continue": [
    "请选择模型与思考强度后继续",
    "請選擇模型與思考強度後繼續",
  ],
  "Could not save settings": ["无法保存设置", "無法儲存設定"],
  "CLI Path and Permissions": ["CLI 路径与权限", "CLI 路徑與權限"],
  "Set Up {provider} in Raycast": [
    "设置 {provider} in Raycast",
    "設定 {provider} in Raycast",
  ],
  "**1 of 2 · Connect your CLI**": [
    "**第 1 步，共 2 步 · 连接 CLI**",
    "**第 1 步，共 2 步 · 連線至 CLI**",
  ],
  "Install Codex CLI and run `codex login` first.": [
    "请先安装 Codex CLI 并运行 `codex login`。",
    "請先安裝 Codex CLI 並執行 `codex login`。",
  ],
  "Install {provider} CLI and sign in from your terminal first.": [
    "请先安装 {provider} CLI 并在终端中登录。",
    "請先安裝 {provider} CLI 並在終端機中登入。",
  ],
  "Check the local connection, sign-in status, and available models. No prompt is sent; model access is confirmed with your first message.":
    [
      "检查本机连接、登录状态和可用模型。此步骤不会发送提问；发送第一条消息时才会确认模型访问权限。",
      "檢查本機連線、登入狀態和可用模型。此步驟不會傳送提問；傳送第一則訊息時才會確認模型存取權限。",
    ],
  "Find the local CLI and its model choices. No prompt is sent; sign-in and model access are confirmed with your first message.":
    [
      "查找本机 CLI 及模型选项。此步骤不会发送提问；发送第一条消息时才会确认登录与模型访问权限。",
      "尋找本機 CLI 及模型選項。此步驟不會傳送提問；傳送第一則訊息時才會確認登入與模型存取權限。",
    ],
  "Checking Connection…": ["正在检查连接…", "正在檢查連線…"],
  "Connection check failed": ["连接检查失败", "連線檢查失敗"],
  "Press Enter to connect. Your chats and model choice stay with this CLI.": [
    "按 Enter 连接。每个 CLI 分别保存对话与模型选择。",
    "按 Enter 連線。每個 CLI 分別儲存對話與模型選擇。",
  ],
  "AI CLI in Raycast · Enable or disable each CLI command in Raycast Settings → Extensions.":
    [
      "AI CLI in Raycast · 在 Raycast 设置 → 扩展中启用或停用各 CLI 命令。",
      "AI CLI in Raycast · 在 Raycast 設定 → 擴充功能中啟用或停用各 CLI 指令。",
    ],
  "Check CLI Connection": ["检查 CLI 连接", "檢查 CLI 連線"],
  "Save and Start Chatting": ["保存并开始对话", "儲存並開始對話"],
  "Check Connection Again": ["重新检查连接", "重新檢查連線"],
  "2 of 2 · Default Model": [
    "第 2 步，共 2 步 · 默认模型",
    "第 2 步，共 2 步 · 預設模型",
  ],
  "CLI connected. Choose a model and effort level. You can change them later in Actions.":
    [
      "CLI 已连接。请选择模型与思考强度，之后可在操作菜单中修改。",
      "CLI 已連線。請選擇模型與思考強度，之後可在動作選單中修改。",
    ],
  "Choose a model, or CLI Default to use the CLI's own choice. Sign-in and model access have not been verified yet.":
    [
      "请选择模型，或选择“CLI 默认”以使用 CLI 自身的选择。登录与模型访问权限尚未验证。",
      "請選擇模型，或選擇「CLI 預設」以使用 CLI 自身的選擇。登入與模型存取權限尚未驗證。",
    ],
  Model: ["模型", "模型"],
  "Choose a model": ["选择模型", "選擇模型"],
  "Effort Level": ["思考强度", "思考強度"],
  "Choose an effort level": ["选择思考强度", "選擇思考強度"],
  "This model does not expose an adjustable effort level.": [
    "此模型不提供可调整的思考强度。",
    "此模型不提供可調整的思考強度。",
  ],
  "Provider: {provider}": ["提供方：{provider}", "提供者：{provider}"],
  "Choose Provider": ["选择提供方", "選擇提供者"],
  "Local AI CLI": ["本机 AI CLI", "本機 AI CLI"],
  "Add Instructions": ["补充指令", "補充指令"],
  "Enter Message": ["输入消息", "輸入訊息"],
  "Write Next Message": ["写下一条消息", "撰寫下一則訊息"],
  "Your draft is saved. Send it after the response finishes or you stop it.": [
    "草稿已保存，回复结束或停止后可发送。",
    "草稿已儲存，回覆結束或停止後可傳送。",
  ],
  "Review Draft": ["预览草稿", "預覽草稿"],
  Draft: ["草稿", "草稿"],
  "Shift+Enter to edit multiple lines": [
    "Shift+Enter 编辑多行",
    "Shift+Enter 編輯多行",
  ],
  "Pending · {preview}": ["待发送 · {preview}", "待傳送 · {preview}"],
  "Type a message, press Enter to send": [
    "输入消息，按 Enter 发送",
    "輸入訊息，按 Enter 傳送",
  ],
  "Send Saved Draft": ["发送已保存的草稿", "傳送已儲存的草稿"],
  "Send Instructions": ["发送补充指令", "傳送補充指令"],
  "Send Message": ["发送消息", "傳送訊息"],
  "Enter a message in the input field first": [
    "请先在输入框中输入消息",
    "請先在輸入框中輸入訊息",
  ],
  "Clear Draft": ["清除草稿", "清除草稿"],
  "Copy Draft to Continue Editing": [
    "复制草稿以继续编辑",
    "複製草稿以繼續編輯",
  ],
  "Reload Model List": ["重新加载模型列表", "重新載入模型清單"],
  "Refresh Model List": ["刷新模型列表", "重新整理模型清單"],
  "Waiting for Connection": ["等待连接", "等待連線"],
  "Model: {model}": ["模型：{model}", "模型：{model}"],
  Auto: ["自动", "自動"],
  "Effort Level: {effort}": ["思考强度：{effort}", "思考強度：{effort}"],
  "Could not continue conversation": ["无法继续对话", "無法繼續對話"],
  "Select a recent conversation…": ["选择最近的对话…", "選擇最近的對話…"],
  "Back to Chat": ["返回对话", "返回對話"],
  "No recent conversations": ["没有最近的对话", "沒有最近的對話"],
  "Go back and enter a question to get started.": [
    "返回并输入问题即可开始。",
    "返回並輸入問題即可開始。",
  ],
  "Continue Conversation": ["继续对话", "繼續對話"],
  "You · Additional Instructions": ["你 · 补充指令", "你 · 補充指令"],
  You: ["你", "你"],
  "Thinking…": ["思考中…", "思考中…"],
  "Connection Notice": ["连接提示", "連線提示"],
  "Your local CLI, ready for a conversation.": [
    "用本机 CLI 开始对话。",
    "用本機 CLI 開始對話。",
  ],
  "Press Enter to open the message composer, enter your message, and press Enter to send.":
    [
      "按 Enter 打开输入框，输入消息后再按 Enter 发送。",
      "按 Enter 開啟輸入框，輸入訊息後再按 Enter 傳送。",
    ],
  Shortcut: ["快捷键", "快捷鍵"],
  Action: ["操作", "動作"],
  "Switch CLI": ["切换 CLI", "切換 CLI"],
  "Part of AI CLI in Raycast · This CLI has its own chats, drafts, and model choice.":
    [
      "AI CLI in Raycast 套件 · 此 CLI 独立保存对话、草稿与模型选择。",
      "AI CLI in Raycast 套件 · 此 CLI 獨立儲存對話、草稿與模型選擇。",
    ],
  "Local AI CLIs": ["本机 AI CLI", "本機 AI CLI"],
  "Chat with your local {provider} CLI": [
    "与本机 {provider} CLI 对话",
    "與本機 {provider} CLI 對話",
  ],
};

/** Values are substituted once, so CLI output and identifiers are never translated. */
export function t(
  english: string,
  values: Record<string, string | number> = {},
): string {
  const translated =
    language === "en"
      ? english
      : (translations[english]?.[language === "zh-CN" ? 0 : 1] ?? english);
  return translated.replace(
    /\{([A-Za-z][A-Za-z0-9_]*)\}/g,
    (token, name: string) =>
      Object.prototype.hasOwnProperty.call(values, name)
        ? String(values[name])
        : token,
  );
}
