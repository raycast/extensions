import { useCallback, useEffect, useState } from "react";
import { showToast, Toast, closeMainWindow, environment, launchCommand, LaunchType } from "@raycast/api";
import fs from "node:fs";
import util from "node:util";
import { exec } from "child_process";
import DetailUI from "./ui/DetailUI";

export default function AskAboutSelectedScreenArea() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureCompleted, setCaptureCompleted] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const captureScreenArea = useCallback(async () => {
    // Prevent multiple concurrent captures
    if (isCapturing || captureCompleted) {
      return;
    }

    try {
      setIsCapturing(true);

      // 关闭 Raycast 窗口以便用户可以看到屏幕
      await closeMainWindow();

      // 等待更长时间让窗口完全关闭，避免并发问题
      await new Promise(resolve => setTimeout(resolve, 1000));

      const execPromise = util.promisify(exec);
      const screenshotPath = `${environment.assetsPath}/screenshot_${Date.now()}.png`;

      // 首先检查是否有正在运行的截图进程
      try {
        await execPromise("pgrep screencapture");
        // 如果有进程在运行，等待它完成
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch {
        // 没有进程在运行，继续
      }

      // 添加超时和更详细的错误处理
      const screencaptureCmd = `/usr/sbin/screencapture -s "${screenshotPath}"`;

      try {
        // 设置超时为30秒，给用户足够时间完成截图
        await Promise.race([
          execPromise(screencaptureCmd),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Screenshot timeout")), 30000)),
        ]);

        // 检查截图文件是否真的存在
        if (!fs.existsSync(screenshotPath)) {
          throw new Error("Screenshot file not created - user may have cancelled");
        }

        await showToast({
          style: Toast.Style.Success,
          title: "截图完成",
          message: "正在启动 Ask AI...",
        });

        // 启动 askAI 命令，传递截图文件路径
        await launchCommand({
          name: "askAI",
          type: LaunchType.UserInitiated,
          context: {
            files: [screenshotPath],
            useSelected: false,
            allowPaste: false,
          },
        });

        setCaptureCompleted(true);
      } catch (error) {
        console.error("Screenshot error:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        if (errorMessage.includes("cannot run two interactive screen captures")) {
          await showToast({
            style: Toast.Style.Failure,
            title: "截图冲突",
            message: "请等待其他截图完成后重试",
          });
        } else if (errorMessage.includes("timeout")) {
          await showToast({
            style: Toast.Style.Failure,
            title: "截图超时",
            message: "请重新运行命令",
          });
        } else {
          await showToast({
            style: Toast.Style.Failure,
            title: "截图取消",
            message: "用户取消了截图操作",
          });
        }
      }
    } catch (error) {
      console.error("截图失败:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "截图失败",
        message: "请重试",
      });
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, captureCompleted]);

  // 组件加载时自动开始截图，但只执行一次
  useEffect(() => {
    if (!hasStarted && !isCapturing && !captureCompleted) {
      setHasStarted(true);
      captureScreenArea();
    }
  }, [hasStarted, isCapturing, captureCompleted, captureScreenArea]);

  // 如果截图完成，显示成功信息
  if (captureCompleted) {
    return <DetailUI textStream="截图已完成，Ask AI 命令已启动。" isLoading={false} lastQuery="" />;
  }

  // 如果正在截图，显示加载状态
  return <DetailUI textStream="正在等待截图..." isLoading={true} lastQuery="" />;
}
