import { showHUD, WindowManagement } from "@raycast/api";
import { exec } from "child_process";

export default async function main() {
  const msg = await WindowManagement.getActiveWindow()
    .then((activeWindow) => {
      const hwnd = activeWindow.id;
      // Iterate over all program windows and minimize them, but skip if matching hwnd
      exec(
        `powershell -NoProfile -Command "` +
          `Add-Type 'using System; using System.Runtime.InteropServices; ` +
          `public class W{ ` +
          `public delegate bool D(IntPtr h,IntPtr l); ` +
          `[DllImport(\\"user32.dll\\")] public static extern bool EnumWindows(D f,IntPtr l); ` +
          `[DllImport(\\"user32.dll\\")] public static extern bool IsWindowVisible(IntPtr h); ` +
          `[DllImport(\\"user32.dll\\")] public static extern IntPtr GetWindow(IntPtr h,int c); ` +
          `[DllImport(\\"user32.dll\\")] public static extern int GetWindowLong(IntPtr h,int i); ` +
          `[DllImport(\\"user32.dll\\")] public static extern bool ShowWindow(IntPtr h,int c2); ` +
          `public const int GW_OWNER=4,GWL_EXSTYLE=-20,WS_EX_TOOLWINDOW=0x80;` +
          `}'; ` +
          `$skip=[IntPtr]${hwnd}; ` +
          `[W]::EnumWindows({param($h,$l) ` +
          `if($h -ne $skip -and ` +
          `[W]::IsWindowVisible($h) -and ` +
          `[W]::GetWindow($h,[W]::GW_OWNER) -eq [IntPtr]::Zero -and ` +
          `(([W]::GetWindowLong($h,[W]::GWL_EXSTYLE) -band [W]::WS_EX_TOOLWINDOW) -eq 0)) ` +
          `{[W]::ShowWindow($h,6)}; ` +
          `$true` +
          `},[IntPtr]::Zero)` +
          `"`,
      );

      return "Focusing '" + activeWindow.application?.name + "'";
    })
    .catch(() => "Failed operation");

  await showHUD(msg);
}
