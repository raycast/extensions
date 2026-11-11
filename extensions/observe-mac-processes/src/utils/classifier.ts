export function classifyProcess(command: string, parentName?: string): string {
  const lower = command.toLowerCase();

  if (
    lower.includes("firefox") ||
    lower.includes("plugin-container") ||
    lower.includes("gpu-helper")
  ) {
    if (
      lower.includes("gpu-helper") ||
      (lower.includes("plugin-container") &&
        (lower.endsWith(" gpu") ||
          lower.includes(" -type gpu") ||
          lower.includes(" gpu ")))
    ) {
      return "GPU Acceleration Process";
    }
    if (
      lower.includes("plugin-container") &&
      (lower.endsWith(" tab") ||
        lower.includes(" -type tab") ||
        lower.includes(" tab "))
    ) {
      return "Web Page / Tab Worker";
    }
    if (
      lower.includes("plugin-container") &&
      (lower.endsWith(" rdd") ||
        lower.includes(" -type rdd") ||
        lower.includes(" rdd "))
    ) {
      return "Media Decoding Process (RDD)";
    }
    if (
      lower.includes("plugin-container") &&
      (lower.endsWith(" socket") ||
        lower.includes(" -type socket") ||
        lower.includes(" socket "))
    ) {
      return "Network / Socket Process";
    }
    if (
      lower.includes("plugin-container") &&
      (lower.endsWith(" utility") ||
        lower.includes(" -type utility") ||
        lower.includes(" utility "))
    ) {
      return "Utility / Sandboxed Service";
    }
    if (
      lower.includes("plugin-container") &&
      (lower.endsWith(" gmplugin") ||
        lower.includes(" -type gmplugin") ||
        lower.includes(" gmplugin "))
    ) {
      return "DRM / Media Plugin";
    }
    if (
      lower.includes("plugin-container") &&
      (lower.endsWith(" forkserver") || lower.includes(" -type forkserver"))
    ) {
      return "Process Fork Server";
    }
    if (lower.includes("plugin-container")) {
      return "Web Page / Tab Worker";
    }
  }

  if (lower.includes("--type=renderer")) {
    if (parentName && /code|cursor|windsurf|sublime|atom/i.test(parentName)) {
      return "Editor Window / Webview";
    }
    return "Web Page / Tab Worker";
  }

  if (lower.includes("--type=gpu-process")) {
    return "GPU Acceleration Process";
  }

  if (lower.includes("--type=utility")) {
    if (
      lower.includes("network.mojom.networkservice") ||
      lower.includes("network")
    ) {
      return "Network Service";
    }
    if (lower.includes("audio.mojom.audioservice") || lower.includes("audio")) {
      return "Audio Service";
    }
    if (
      lower.includes("storage.mojom.storageservice") ||
      lower.includes("storage")
    ) {
      return "Storage / Cache Service";
    }
    if (
      lower.includes("video_capture.mojom.videocaptureservice") ||
      lower.includes("video_capture")
    ) {
      return "Video / Camera Capture Service";
    }
    if (lower.includes("node.mojom.nodeservice") || lower.includes("node")) {
      return "Extension Host / Node Service";
    }
    return "Utility / Background Service";
  }

  if (
    lower.includes("--type=crashpad-handler") ||
    lower.includes("crashreporter")
  ) {
    return "Crash Reporter";
  }

  if (lower.includes("--type=plugin")) {
    return "Plugin / Extension Service";
  }

  if (lower.includes("com.apple.webkit.webcontent")) {
    return "Web Page / Tab Worker";
  }
  if (lower.includes("com.apple.webkit.gpu")) {
    return "GPU Acceleration Process";
  }
  if (lower.includes("com.apple.webkit.networking")) {
    return "Network Process";
  }

  if (lower.includes("tsserver") || lower.includes("typescript/lib/tsserver")) {
    return "TypeScript Language Server";
  }
  if (lower.includes("rust-analyzer")) {
    return "Rust Language Server";
  }
  if (lower.includes("pyright") || lower.includes("pylance")) {
    return "Python Language Server";
  }
  if (lower.includes("gopls")) {
    return "Go Language Server";
  }
  if (lower.includes("clangd")) {
    return "C/C++ Language Server";
  }
  if (lower.includes("copilot-agent") || lower.includes("github.copilot")) {
    return "GitHub Copilot Worker";
  }
  if (lower.includes("ptyhost")) {
    return "Integrated Terminal Host";
  }
  if (lower.includes("filewatcher") || lower.includes("watcherService")) {
    return "File System Watcher";
  }

  if (
    lower.includes("mdworker") ||
    lower.includes("mdworker_shared") ||
    lower.includes("/mds")
  ) {
    return "Spotlight Search Indexer";
  }
  if (lower.includes("windowserver")) {
    return "Display & Window Compositor";
  }
  if (lower.includes("kernel_task")) {
    return "Kernel & Thermal Management";
  }
  if (lower.includes("bluetoothd")) {
    return "Bluetooth Daemon";
  }
  if (lower.includes("coreaudiod")) {
    return "Core Audio Daemon";
  }
  if (lower.includes("backupd")) {
    return "Time Machine Backup Engine";
  }
  if (lower.includes("photoanalysisd") || lower.includes("photolibraryd")) {
    return "Photos Background Analysis";
  }
  if (lower.includes("bird")) {
    return "iCloud Drive Sync Engine";
  }
  if (lower.includes("cloudd")) {
    return "CloudKit Sync Daemon";
  }

  if (lower.includes("helper (renderer)")) {
    return "Web Page / Tab Worker";
  }
  if (lower.includes("helper (gpu)")) {
    return "GPU Acceleration Process";
  }
  if (lower.includes("helper (plugin)")) {
    return "Plugin / Extension Service";
  }
  if (lower.includes("helper")) {
    return "Background Helper Worker";
  }

  const binaryMatch = command.match(/^(\S+)/);
  if (binaryMatch) {
    const rawBinary = binaryMatch[1].split("/").pop() || "Worker";
    return `${rawBinary.replace(/[^a-zA-Z0-9_-]/g, "")} Process`;
  }

  return "Background Worker";
}
