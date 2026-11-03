' Aria2Hook.vbs
' Hidden hook shim for aria2 completion/error callbacks.
'
' aria2 appends its own arguments after the configured command, so the engine
' puts the event name first in the hook command:
'
'   wscript.exe //nologo Aria2Hook.vbs download <gid> <numFiles> <path>
'   wscript.exe //nologo Aria2Hook.vbs bt <gid>
'   wscript.exe //nologo Aria2Hook.vbs error <gid> <numFiles> <path>
'
' The shim locates Notify-Aria2.ps1 next to itself, launches Windows PowerShell
' hidden and exits immediately so aria2 is never blocked by notifications.

Option Explicit

Dim hookArgs, eventName, gid, numFiles, filePath
Dim fileSystem, engineDir, notifyScript, windowsDir, powershellExe
Dim shell, commandLine

Set hookArgs = WScript.Arguments
If hookArgs.Count < 2 Then
    WScript.Quit 0
End If

eventName = LCase(hookArgs(0))
If eventName <> "download" And eventName <> "bt" And eventName <> "error" Then
    WScript.Quit 0
End If

gid = Trim(hookArgs(1))
If Len(gid) <> 16 Then
    WScript.Quit 0
End If

numFiles = ""
filePath = ""
If hookArgs.Count >= 3 Then
    If IsNumeric(hookArgs(2)) Then
        numFiles = Trim(hookArgs(2))
    End If
End If
If hookArgs.Count >= 4 Then
    filePath = hookArgs(3)
End If

Set fileSystem = CreateObject("Scripting.FileSystemObject")
engineDir = fileSystem.GetParentFolderName(WScript.ScriptFullName)
notifyScript = fileSystem.BuildPath(engineDir, "Notify-Aria2.ps1")
If Not fileSystem.FileExists(notifyScript) Then
    WScript.Quit 0
End If

windowsDir = fileSystem.GetSpecialFolder(0)
powershellExe = fileSystem.BuildPath(windowsDir, "System32\WindowsPowerShell\v1.0\powershell.exe")
If Not fileSystem.FileExists(powershellExe) Then
    powershellExe = "powershell.exe"
End If

commandLine = Chr(34) & powershellExe & Chr(34) & " -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File " & Chr(34) & notifyScript & Chr(34) & " -Event " & eventName & " -Gid " & gid
If Len(numFiles) > 0 Then
    commandLine = commandLine & " -NumFiles " & numFiles
End If
If Len(filePath) > 0 Then
    commandLine = commandLine & " -Path " & Chr(34) & filePath & Chr(34)
End If

Set shell = CreateObject("WScript.Shell")
On Error Resume Next
shell.Run commandLine, 0, False
On Error GoTo 0
WScript.Quit 0
