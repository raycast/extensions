import { useState, useEffect } from "react";
import {
  showToast,
  Toast,
  getPreferenceValues,
  open,
  showHUD,
  confirmAlert,
  getSelectedFinderItems,
  Icon,
  List,
  Action,
  ActionPanel,
  Color,
} from "@raycast/api";
import { execa } from "execa";
import fs from "fs-extra";
import path from "path";
import { promisify } from "util";
import { exec } from "child_process";

const execPromise = promisify(exec);

interface Preferences {
  ghostscriptPath: string;
}

enum CompressionLevel {
  DEFAULT = "default",
  SCREEN = "screen",
  EBOOK = "ebook",
  PRINTER = "printer",
  PREPRESS = "prepress",
}

const compressionLevelDescriptions = {
  [CompressionLevel.DEFAULT]: "Default compression level",
  [CompressionLevel.SCREEN]: "Screen quality (72dpi) - smallest file size",
  [CompressionLevel.EBOOK]: "eBook quality (150dpi)",
  [CompressionLevel.PRINTER]: "Print quality (300dpi)",
  [CompressionLevel.PREPRESS]: "Prepress quality (300dpi with color preservation) - highest quality",
};

interface FileInfo {
  path: string;
  name: string;
  status: "pending" | "processing" | "success" | "error";
  originalSize?: number;
  compressedSize?: number;
  compressionRate?: string;
  error?: string;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [gsPath, setGsPath] = useState<string | null>(null);
  const [isInstallingGhostscript, setIsInstallingGhostscript] = useState(false);
  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>(CompressionLevel.DEFAULT);
  const [files, setFiles] = useState<FileInfo[]>([]);

  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    async function initialize() {
      try {
        // 获取选中的文件
        const selectedItems = await getSelectedFinderItems();
        if (selectedItems.length === 0) {
          await showToast({
            style: Toast.Style.Failure,
            title: "未选择文件",
            message: "请先在 Finder 中选择 PDF 文件",
          });
          setIsLoading(false);
          return;
        }

        // 过滤出 PDF 文件
        const pdfFiles = selectedItems.filter((item) => item.path.toLowerCase().endsWith(".pdf"));
        if (pdfFiles.length === 0) {
          await showToast({
            style: Toast.Style.Failure,
            title: "未选择 PDF 文件",
            message: "请确保选择的是 PDF 文件",
          });
          setIsLoading(false);
          return;
        }

        // 初始化文件列表
        const fileInfos = pdfFiles.map((item) => ({
          path: item.path,
          name: path.basename(item.path),
          status: "pending" as const,
        }));

        setFiles(fileInfos);

        // 检查并获取 Ghostscript 路径
        const ghostscriptPath = await findGhostscriptPath();
        setGsPath(ghostscriptPath);
        setIsLoading(false);

        // 自动开始压缩所有文件
        if (ghostscriptPath) {
          processFiles(fileInfos, compressionLevel, ghostscriptPath);
        } else {
          // 如果 Ghostscript 不可用，显示提示
          await showToast({
            style: Toast.Style.Failure,
            title: "未找到 Ghostscript",
            message: "请确保已安装 Ghostscript",
          });
        }
      } catch (error) {
        console.error(error);
        await showToast({
          style: Toast.Style.Failure,
          title: "获取文件失败",
          message: error instanceof Error ? error.message : "未知错误",
        });
        setIsLoading(false);
      }
    }

    initialize();
  }, []);

  async function findGhostscriptPath(): Promise<string | null> {
    // 1. 首先检查用户设置的路径
    if (preferences.ghostscriptPath) {
      try {
        await execPromise(`"${preferences.ghostscriptPath}" -v`);
        return preferences.ghostscriptPath;
      } catch (e) {
        console.log("用户设置的 Ghostscript 路径无效:", e);
      }
    }

    // 2. 检查常见的 Ghostscript 路径
    const commonPaths = ["gs", "/usr/local/bin/gs", "/opt/homebrew/bin/gs", "/usr/bin/gs"];

    for (const path of commonPaths) {
      try {
        await execPromise(`${path} -v`);
        return path;
      } catch (e) {
        console.log(`路径 ${path} 不可用:`, e);
      }
    }

    // 3. 尝试使用 which 命令查找
    try {
      const { stdout } = await execPromise("which gs");
      const gsPath = stdout.trim();
      if (gsPath) {
        try {
          await execPromise(`${gsPath} -v`);
          return gsPath;
        } catch (e) {
          console.log(`which 找到的路径 ${gsPath} 不可用:`, e);
        }
      }
    } catch (e) {
      console.log("which 命令未找到 gs:", e);
    }

    return null;
  }

  async function installGhostscript() {
    setIsInstallingGhostscript(true);

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "正在安装 Ghostscript",
        message: "请稍候...",
      });

      try {
        await execa("brew", ["install", "ghostscript"]);

        // 安装后重新查找路径
        const newGsPath = await findGhostscriptPath();
        setGsPath(newGsPath);

        if (newGsPath) {
          await showToast({
            style: Toast.Style.Success,
            title: "Ghostscript 安装成功",
            message: "现在可以使用 PDF 压缩功能了",
          });

          // 如果有文件待处理，开始压缩
          if (files.length > 0) {
            processFiles(files, compressionLevel, newGsPath);
          }
        } else {
          throw new Error("安装后无法找到 Ghostscript");
        }
      } catch (error) {
        console.error("安装 Ghostscript 失败:", error);

        await showToast({
          style: Toast.Style.Failure,
          title: "安装 Ghostscript 失败",
          message: "请尝试手动安装: brew install ghostscript",
        });
      }
    } finally {
      setIsInstallingGhostscript(false);
    }
  }

  async function processFiles(fileInfos: FileInfo[], level: CompressionLevel, ghostscriptPath: string) {
    // 如果没有找到 Ghostscript 路径，提示安装
    if (!ghostscriptPath) {
      const shouldInstall = await confirmAlert({
        title: "未找到 Ghostscript",
        message: "PDF 压缩需要 Ghostscript。是否尝试安装？",
        primaryAction: {
          title: "安装",
        },
      });

      if (shouldInstall) {
        await installGhostscript();
      }
      return;
    }

    // 依次处理每个文件
    for (let i = 0; i < fileInfos.length; i++) {
      const fileInfo = fileInfos[i];
      const filePath = fileInfo.path;

      // 更新文件状态为处理中
      setFiles((prev) => prev.map((file) => (file.path === filePath ? { ...file, status: "processing" } : file)));

      // 显示正在处理的提示
      await showToast({
        style: Toast.Style.Animated,
        title: `正在压缩: ${fileInfo.name}`,
        message: `${i + 1}/${fileInfos.length}`,
      });

      try {
        // 生成输出文件路径
        const ext = path.extname(filePath);
        const baseName = path.basename(filePath, ext);
        const dir = path.dirname(filePath);
        const outputFile = path.join(dir, `${baseName}_compressed${ext}`);

        // 获取原文件大小
        const originalStats = await fs.stat(filePath);

        // 执行压缩
        await execa(ghostscriptPath, [
          "-sDEVICE=pdfwrite",
          "-dCompatibilityLevel=1.4",
          "-dPDFSETTINGS=/" + level,
          "-dNOPAUSE",
          "-dQUIET",
          "-dBATCH",
          `-sOutputFile=${outputFile}`,
          filePath,
        ]);

        // 获取压缩后文件大小
        const compressedStats = await fs.stat(outputFile);
        const reductionPercent = ((1 - compressedStats.size / originalStats.size) * 100).toFixed(1);

        // 更新文件状态为成功
        setFiles((prev) =>
          prev.map((file) =>
            file.path === filePath
              ? {
                  ...file,
                  status: "success",
                  originalSize: originalStats.size,
                  compressedSize: compressedStats.size,
                  compressionRate: reductionPercent,
                }
              : file,
          ),
        );

        await showToast({
          style: Toast.Style.Success,
          title: `压缩完成: ${baseName}`,
          message: `减小了 ${reductionPercent}% 的大小`,
        });
      } catch (error) {
        console.error(`处理文件 ${filePath} 时出错:`, error);

        // 更新文件状态为错误
        setFiles((prev) =>
          prev.map((file) =>
            file.path === filePath
              ? {
                  ...file,
                  status: "error",
                  error: error instanceof Error ? error.message : "未知错误",
                }
              : file,
          ),
        );

        await showToast({
          style: Toast.Style.Failure,
          title: `压缩失败: ${path.basename(filePath)}`,
          message: error instanceof Error ? error.message : "未知错误",
        });
      }
    }

    // 所有文件处理完成后，显示总结果
    const successFiles = files.filter((file) => file.status === "success");
    if (successFiles.length > 0) {
      const totalOriginal = successFiles.reduce((sum, file) => sum + (file.originalSize || 0), 0);
      const totalCompressed = successFiles.reduce((sum, file) => sum + (file.compressedSize || 0), 0);
      const totalReduction = ((1 - totalCompressed / totalOriginal) * 100).toFixed(1);

      await showHUD(`压缩完成! ${successFiles.length} 个文件，总计减小了 ${totalReduction}% 的大小`);

      // 打开第一个文件所在的文件夹
      if (successFiles.length > 0) {
        await open(path.dirname(successFiles[0].path));
      }
    }
  }

  function formatSize(bytes?: number): string {
    if (bytes === undefined) return "未知";

    const units = ["B", "KB", "MB", "GB", "TB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "pending":
        return { source: Icon.Clock, tintColor: Color.Blue };
      case "processing":
        return { source: Icon.CircleProgress, tintColor: Color.Yellow };
      case "success":
        return { source: Icon.Checkmark, tintColor: Color.Green };
      case "error":
        return { source: Icon.ExclamationMark, tintColor: Color.Red };
      default:
        return { source: Icon.QuestionMark, tintColor: Color.PrimaryText };
    }
  }

  // 手动重新开始压缩所有文件
  const startCompression = async () => {
    if (gsPath) {
      await processFiles(files, compressionLevel, gsPath);
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "未找到 Ghostscript",
        message: "请确保已安装 Ghostscript",
      });
    }
  };

  return (
    <List
      isLoading={isLoading || isInstallingGhostscript}
      searchBarPlaceholder="搜索文件..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="压缩级别"
          value={compressionLevel}
          onChange={(newValue) => {
            setCompressionLevel(newValue as CompressionLevel);
          }}
        >
          {Object.entries(compressionLevelDescriptions).map(([level, description]) => (
            <List.Dropdown.Item key={level} title={description} value={level} />
          ))}
        </List.Dropdown>
      }
    >
      {!gsPath && !isInstallingGhostscript && (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Yellow }}
          title="未找到 Ghostscript"
          description="PDF 压缩需要 Ghostscript。点击下方按钮安装，或在偏好设置中指定路径。"
          actions={
            <ActionPanel>
              <Action title="安装 Ghostscript" icon={Icon.Download} onAction={installGhostscript} />
            </ActionPanel>
          }
        />
      )}

      {files.length > 0 && (
        <List.Section title="文件列表" subtitle={`共 ${files.length} 个文件`}>
          {files.map((file) => (
            <List.Item
              key={file.path}
              icon={getStatusIcon(file.status)}
              title={file.name}
              subtitle={file.status === "error" ? file.error : undefined}
              accessories={[
                {
                  text:
                    file.status === "success"
                      ? `${formatSize(file.originalSize)} → ${formatSize(file.compressedSize)} (减小 ${file.compressionRate}%)`
                      : file.status === "processing"
                        ? "处理中..."
                        : file.status.toUpperCase(),
                },
              ]}
              actions={
                <ActionPanel>
                  {file.status === "success" && (
                    <>
                      <Action
                        title="打开压缩后的文件"
                        icon={Icon.Eye}
                        onAction={() =>
                          open(path.join(path.dirname(file.path), `${path.basename(file.path, ".pdf")}_compressed.pdf`))
                        }
                      />
                      <Action
                        title="打开文件所在文件夹"
                        icon={Icon.Folder}
                        onAction={() => open(path.dirname(file.path))}
                      />
                    </>
                  )}
                  {file.status === "error" && gsPath && (
                    <Action
                      title="重试"
                      icon={Icon.RotateClockwise}
                      onAction={() => processFiles([file], compressionLevel, gsPath)}
                    />
                  )}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {/* 添加全局操作按钮，仅当有错误文件时显示 */}
      {files.length > 0 && files.some((f) => f.status === "error") && gsPath && (
        <List.Section title="操作">
          <List.Item
            title="重新压缩所有文件"
            icon={Icon.RotateClockwise}
            actions={
              <ActionPanel>
                <Action title="重新压缩" icon={Icon.RotateClockwise} onAction={startCompression} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
