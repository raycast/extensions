export function buildPollScript(outPath: string): string {
  const safePath = outPath.replace(/'/g, "''");
  return [
    "$ErrorActionPreference = 'SilentlyContinue'",
    "Add-Type -AssemblyName System.Drawing",
    "Add-Type -MemberDefinition '[DllImport(\"user32.dll\")] public static extern uint GetClipboardSequenceNumber();' -Name CS -Namespace WinApi",
    "$baseline = [WinApi.CS]::GetClipboardSequenceNumber()",
    "$deadline = (Get-Date).AddSeconds(85)",
    "while ((Get-Date) -lt $deadline) {",
    "  $current = [WinApi.CS]::GetClipboardSequenceNumber()",
    "  if ($current -ne $baseline) {",
    "    $img = Get-Clipboard -Format Image",
    `    if ($img -ne $null) { $img.Save('${safePath}'); exit 0 }`,
    "    $baseline = $current",
    "  }",
    "  Start-Sleep -Milliseconds 150",
    "}",
    "exit 1",
  ].join("\n");
}
