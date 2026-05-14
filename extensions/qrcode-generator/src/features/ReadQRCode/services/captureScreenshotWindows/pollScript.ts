export function buildPollScript(outPath: string): string {
  const safePath = outPath.replace(/'/g, "''");
  return [
    "$ErrorActionPreference = 'Stop'",
    "try {",
    "  Add-Type -AssemblyName System.Drawing",
    "  Add-Type -MemberDefinition '[DllImport(\"user32.dll\")] public static extern uint GetClipboardSequenceNumber();' -Name CS -Namespace WinApi",
    "  $baseline = [WinApi.CS]::GetClipboardSequenceNumber()",
    "  $deadline = (Get-Date).AddSeconds(85)",
    "  while ((Get-Date) -lt $deadline) {",
    "    $current = [WinApi.CS]::GetClipboardSequenceNumber()",
    "    if ($current -ne $baseline) {",
    "      $img = Get-Clipboard -Format Image",
    `      if ($null -ne $img) { $img.Save('${safePath}'); exit 0 }`,
    "      $baseline = $current",
    "    }",
    "    Start-Sleep -Milliseconds 150",
    "  }",
    "  exit 1",
    "} catch {",
    "  exit 2",
    "}",
  ].join("\n");
}
