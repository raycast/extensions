; Inno Setup script for Quick Shell for Raycast (sideload / GitHub / WinGet)

#define AppVersion "0.0.0.0"
#define DisplayName "Quick Shell for Raycast"
#define InstallerBaseName "QuickShellforRaycast"
#define DeveloperName "Tony Thompson"
#define ExtensionSource "__MUST_BE_SET_BY_BUILD_SCRIPT__"
#define ExtensionDest "{userappdata}\raycast-x\extensions\quickshell"

[Setup]
AppId={{A4E8B2D1-7C3F-4A9E-B5D1-2F8E6C0A1B3D}}
AppName={#DisplayName}
AppVersion={#AppVersion}
AppPublisher={#DeveloperName}
AppPublisherURL=https://github.com/tonythethompson/QuickShell
DefaultDirName={userappdata}\QuickShell\Raycast
DisableDirPage=yes
DisableProgramGroupPage=yes
OutputDir=bin\Release\installer
OutputBaseFilename={#InstallerBaseName}-Setup-{#AppVersion}-x64
Compression=lzma
SolidCompression=yes
MinVersion=10.0.19041
PrivilegesRequired=lowest
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "{#ExtensionSource}\*"; DestDir: "{#ExtensionDest}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Messages]
FinishedLabel=Quick Shell for Raycast was copied to %n%n{#ExtensionDest}%n%nOpen Raycast, then use Developer → Import Extension if the commands do not appear automatically. You need Raycast for Windows installed.

[UninstallDelete]
Type: filesandordirs; Name: "{#ExtensionDest}"
