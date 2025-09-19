import { showHUD, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import { homedir } from "os";

const execAsync = promisify(exec);

// 获取adb命令的完整路径
async function getAdbPath(): Promise<string> {
  try {
    console.log("开始查找adb路径...");

    // 使用os.homedir()获取用户主目录
    const userHomeDir = homedir();
    console.log(`用户主目录: ${userHomeDir}`);

    // 尝试从更多常见路径查找adb
    const commonPaths = [
      "/usr/local/bin/adb",
      "/opt/homebrew/bin/adb",
      "/Applications/Android Studio.app/Contents/jre/Contents/Home/bin/adb",
      "/Applications/Android Studio.app/Contents/plugins/android/resources/tools/bin/adb",
      `${userHomeDir}/Library/Android/sdk/platform-tools/adb`,
      `${userHomeDir}/android-sdk/platform-tools/adb`,
      `${userHomeDir}/Developer/Android/sdk/platform-tools/adb`,
      `${userHomeDir}/Downloads/platform-tools/adb`,
      "/usr/local/opt/android-sdk/platform-tools/adb",
      "/opt/android-sdk/platform-tools/adb",
      "/usr/bin/adb",
      "/bin/adb",
      "/usr/local/share/android-sdk/platform-tools/adb",
      "/opt/share/android-sdk/platform-tools/adb",
    ];

    // 检查常见路径（使用fs.existsSync更可靠）
    for (const path of commonPaths) {
      console.log(`检查常见路径: ${path}`);
      if (existsSync(path)) {
        console.log(`找到存在的adb路径: ${path}`);
        return path;
      }
    }

    // 尝试使用系统默认PATH查找adb
    try {
      console.log("尝试直接执行adb version命令...");
      await execAsync("adb version", { timeout: 3000 });
      console.log("直接执行adb命令成功，使用默认PATH中的adb");
      return "adb";
    } catch (adbError) {
      console.log(`直接执行adb命令失败: ${adbError}`);
    }

    // 尝试使用which命令
    try {
      console.log("执行which adb命令...");
      const { stdout } = await execAsync("which adb");
      const whichPath = stdout.trim();
      if (whichPath && existsSync(whichPath)) {
        console.log(`通过which找到adb路径: ${whichPath}`);
        return whichPath;
      }
    } catch (whichError) {
      console.log(`which命令失败: ${whichError}`);
    }

    console.log("所有查找方法都失败，返回默认adb命令");
    return "adb";
  } catch (error) {
    console.log(`getAdbPath函数出错: ${error}`);
    return "adb";
  }
}

export default async function main() {
  try {
    const adbPath = await getAdbPath();
    console.log(`最终使用的adb路径: ${adbPath}`);

    // 验证adb路径是否可执行
    try {
      console.log(`验证adb路径是否可执行: ${adbPath}`);
      const { stdout } = await execAsync(`${adbPath} version`, { timeout: 3000 });
      console.log(`adb版本信息: ${stdout.trim()}`);
    } catch (versionError) {
      console.log(`adb版本验证失败: ${versionError}`);
      await showToast({
        style: Toast.Style.Failure,
        title: "adb命令无效",
        message: `找到adb文件但无法执行，请检查权限或文件完整性`,
      });
      return;
    }

    // 构建要执行的adb命令
    const adbCommand = `${adbPath} shell am force-stop com.cat.readall`;
    console.log(`准备执行命令: ${adbCommand}`);

    // 在后台执行adb命令，增加超时和详细输出
    try {
      const { stdout, stderr } = await execAsync(adbCommand, {
        timeout: 10000, // 10秒超时
        maxBuffer: 1024 * 1024, // 增加缓冲区大小
      });

      // 记录命令执行结果
      if (stdout) {
        console.log(`命令执行输出: ${stdout.trim()}`);
      }
      if (stderr) {
        console.log(`命令执行错误输出: ${stderr.trim()}`);
      }

      // 即使没有输出也显示成功（因为有些adb命令可能没有输出）
      console.log("命令执行成功");
      await showHUD("已成功执行命令: 强制停止悟空浏览器");
    } catch (cmdError) {
      console.error(`执行adb命令时出错: ${cmdError}`);
      // 即使出错也尝试显示完成消息，因为有些adb命令可能会返回非零退出码但仍成功执行
      await showHUD("命令执行完成: 强制停止悟空浏览器");
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`执行命令失败: ${errorMessage}`);

    if (errorMessage.includes("not found")) {
      await showToast({
        style: Toast.Style.Failure,
        title: "adb命令未找到",
        message: `请手动检查adb安装位置。常见位置: ~/Library/Android/sdk/platform-tools/adb`,
      });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "执行命令失败",
        message: errorMessage,
      });
    }
  }
}
