import { homedir } from "os";
import { join } from "path";
import { showHUD, Clipboard } from "@raycast/api";
import { execSync } from "child_process";

export default async function command() {
  try {
    // 正确展开用户目录路径
    const dbPath = join(homedir(), "Library/Messages/chat.db");

    // 首先检查文件是否可访问
    const checkAccess = `ls -l "${dbPath}"`;
    try {
      execSync(checkAccess);
    } catch (error) {
      await showHUD("无法访问 Messages 数据库，请检查权限");
      return;
    }

    const query = `
      SELECT 
        message.text
      FROM 
        message 
      WHERE 
        (message.text LIKE '%验证码%' 
        OR message.text REGEXP '[0-9]{4,6}')
        AND NOT EXISTS (
          SELECT 1 
          FROM chat_recoverable_message_join 
          WHERE chat_recoverable_message_join.message_id = message.ROWID
        )
      ORDER BY 
        message.date DESC 
      LIMIT 1
    `;

    // 使用完整路径执行查询
    const result = execSync(`sqlite3 "${dbPath}" "${query}"`).toString();
    // 使用正则表达式提取验证码
    const codeMatch = result.match(/[0-9]{4,6}/);

    // 获取短信签名开头【】内包含的
    const signMatch = result.match(/【.*】/);

    if (codeMatch) {
      const verificationCode = codeMatch[0];

      // 复制到剪贴板
      await Clipboard.copy(verificationCode);

      const signName = signMatch ? signMatch[0] : "";
      // 显示成功提示
      await showHUD(`${signName} ${verificationCode} 已复制到剪贴板`);
    } else {
      await showHUD("未找到验证码");
    }
  } catch (error) {
    console.error("Error:", error);
    await showHUD("获取验证码失败");
  }
}
