import { runAppleScript } from "@raycast/utils";

export const runShortcut = async (name: string, input: string) => {
  const script = `
  tell application "Shortcuts"
    set shortcutName to "${name}"
    set inputURL to "${input}"

    try
        run shortcut shortcutName with input inputURL
        return true -- 快捷指令存在并尝试运行
    on error errorMessage
        return errorMessage -- 返回错误信息
    end try
end tell
`;

  return await runAppleScript(script);
};
