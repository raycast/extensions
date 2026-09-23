// Goose 2FA 的最小原生 helper：真实键盘输入 + 截图条码识别。
// 由 raycast/scripts/build-helper.mjs 在 build 阶段用 swiftc 编译，
// 产物是 assets/goose-2fa-helper（单文件二进制），运行时由 Node 侧 execFile 调用。
//
// 用法：
//   goose-2fa-helper type <text>   把文本作为真实按键输入到最前台应用（需要辅助功能权限）
//   goose-2fa-helper qr <image>    识别图片里的 QR/条码，逐行输出 payload

import AppKit
import ApplicationServices
import CoreGraphics
import Foundation
import Vision

func tr(_ english: String, _ chinese: String) -> String {
    ProcessInfo.processInfo.environment["GOOSE_2FA_LANG"] == "zh-Hans" ? chinese : english
}

func fail(_ code: Int32, _ message: String) -> Never {
    FileHandle.standardError.write(Data((message + "\n").utf8))
    exit(code)
}

/// 用 CGEvent 逐字符输入：与剪贴板无关，不污染剪贴板历史。
func typeText(_ text: String) {
    guard AXIsProcessTrusted() else {
        fail(3, tr("Accessibility permission required: allow Raycast in System Settings → Privacy & Security → Accessibility.", "缺少辅助功能权限：请在系统设置 → 隐私与安全性 → 辅助功能中允许 Raycast。"))
    }
    guard let source = CGEventSource(stateID: .combinedSessionState) else {
        fail(4, tr("Could not create keyboard event source.", "无法创建键盘事件源。"))
    }
    for character in Array(text.utf16) {
        var unit = character
        for isDown in [true, false] {
            guard let event = CGEvent(keyboardEventSource: source, virtualKey: 0, keyDown: isDown) else {
                fail(4, tr("Could not create keyboard event.", "无法创建键盘事件。"))
            }
            event.keyboardSetUnicodeString(stringLength: 1, unicodeString: &unit)
            event.post(tap: .cghidEventTap)
        }
        usleep(1200)
    }
}

/// 用 Vision 识别图片里的条码，逐行输出 payload（otpauth:// 或二维码内容）。
func detectBarcodes(_ imagePath: String) {
    let url = URL(fileURLWithPath: imagePath)
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
          let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
        fail(5, tr("Could not read image: \(imagePath)", "无法读取图片：\(imagePath)"))
    }
    let request = VNDetectBarcodesRequest()
    request.symbologies = [.qr, .aztec, .code128]
    let handler = VNImageRequestHandler(cgImage: image, options: [:])
    do {
        try handler.perform([request])
    } catch {
        fail(6, tr("Barcode scan failed: \(error.localizedDescription)", "条码识别失败：\(error.localizedDescription)"))
    }
    let observations = request.results ?? []
    for observation in observations {
        if let payload = observation.payloadStringValue, !payload.isEmpty {
            print(payload)
        }
    }
}

let arguments = CommandLine.arguments
guard arguments.count >= 2 else {
    fail(2, tr("Usage: goose-2fa-helper type <text> | qr <image>", "用法：goose-2fa-helper type <text> | qr <image>"))
}

switch arguments[1] {
case "type":
    guard arguments.count >= 3 else { fail(2, tr("Missing text to type.", "缺少要输入的文本。")) }
    typeText(arguments[2])
case "qr":
    guard arguments.count >= 3 else { fail(2, tr("Missing image path.", "缺少图片路径。")) }
    detectBarcodes(arguments[2])
default:
    fail(2, tr("Unknown subcommand: \(arguments[1])", "未知子命令：\(arguments[1])"))
}
