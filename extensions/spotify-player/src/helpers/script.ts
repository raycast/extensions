import { runAppleScript, runPowerShellScript } from "@raycast/utils";
import { buildScriptEnsuringSpotifyIsRunning, runAppleScriptSilently } from "./applescript";

export class WinNotSupportedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WinNotSupportedError";
  }
}

export enum SpotifyScriptType {
  Play,
  Pause,
  NextTrack,
  PreviousTrack,
  PlayTrack,
  SetVolume,
  SetPosition,
}

export async function runSpotifyScript(
  type:
    | SpotifyScriptType.Play
    | SpotifyScriptType.Pause
    | SpotifyScriptType.NextTrack
    | SpotifyScriptType.PreviousTrack,
  silently?: boolean,
): Promise<void>;
export async function runSpotifyScript(
  type: SpotifyScriptType.SetPosition,
  silently: boolean,
  position: number | string,
): Promise<void>;
export async function runSpotifyScript(
  type: SpotifyScriptType.SetVolume,
  silently: boolean,
  volume: number | string,
): Promise<void>;
export async function runSpotifyScript(
  type: SpotifyScriptType.PlayTrack,
  silently: boolean,
  trackUri: string,
  delay?: number,
): Promise<void>;
export async function runSpotifyScript(
  type: SpotifyScriptType,
  silently: boolean = false,
  uriOrVolume?: string | number,
  delay?: number,
): Promise<void> {
  if (process.platform === "win32") {
    await runSpotifyScriptOnWindows(type, uriOrVolume);
  } else {
    await runSpotifyScriptOnMacOs(type, silently, uriOrVolume, delay);
  }
}

async function runSpotifyScriptOnWindows(type: SpotifyScriptType, uriOrVolume?: string | number): Promise<void> {
  const POWERSHELL_HELPER_SCRIPT = `
  Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' })[0]

Function Await($WinRtTask, $ResultType) {
    $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
    $netTask = $asTask.Invoke($null, @($WinRtTask))
    $netTask.Wait(-1) | Out-Null
    $netTask.Result
}

Function Get-SpotifySession {
    [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime] | Out-Null
    $mediaManager = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])

    $sessions = $mediaManager.GetSessions()
    $spotifySession = $sessions | Where-Object {
        $_.SourceAppUserModelId -match "Spotify"
    }

    return $spotifySession
}

Function Start-Spotify {
    try {
        Start-Process "spotify:"

        $timeout = 15
        $elapsed = 0
        while ($elapsed -lt $timeout) {
            Start-Sleep -Seconds 1
            $elapsed++

            $session = Get-SpotifySession
            if ($session) {
                return $session
            }
        }

        return $null

    } catch {
        return $null
    }
}

Function Ensure-SpotifyRunning {
    $session = Get-SpotifySession

    if (-not $session) {
        $session = Start-Spotify

        if (-not $session) {
            # One more try after startup
            Start-Sleep -Seconds 2
            $session = Get-SpotifySession
        }
    }

    return $session
}
  `;

  const runScript = async (scriptBody: string) => {
    const finalScript = `
${POWERSHELL_HELPER_SCRIPT}
$session = Ensure-SpotifyRunning
    if ($session) {
     Await ($session.${scriptBody}) ([bool])
  }
    `;
    await runPowerShellScript(finalScript);
  };

  switch (type) {
    case SpotifyScriptType.Play:
      await runScript("TryPlayAsync()");
      break;
    case SpotifyScriptType.Pause:
      await runScript("TryPauseAsync()");
      break;
    case SpotifyScriptType.NextTrack:
      await runScript("TrySkipNextAsync()");
      break;
    case SpotifyScriptType.PreviousTrack:
      await runScript("TrySkipPreviousAsync()");
      break;
    case SpotifyScriptType.PlayTrack:
      await runPowerShellScript(`Start-Process "${uriOrVolume}"`);
      break;
    case SpotifyScriptType.SetVolume:
      throw new WinNotSupportedError("Setting volume on non premium account is not supported on Windows");
    case SpotifyScriptType.SetPosition:
      throw new WinNotSupportedError("Setting position on non premium account is not supported on Windows");
    default:
      break;
  }
}

async function runSpotifyScriptOnMacOs(
  type: SpotifyScriptType,
  silently: boolean = false,
  uriOrVolume?: string | number,
  delay?: number,
): Promise<void> {
  const runScript = async (script: string) => {
    if (delay && delay > 0) {
      script = `
      delay ${delay}
      ${script}
    `;
    }

    if (silently) {
      await runAppleScriptSilently(script);
    } else {
      await runAppleScript(script);
    }
  };

  switch (type) {
    case SpotifyScriptType.Play:
      await runScript(buildScriptEnsuringSpotifyIsRunning("play"));
      break;
    case SpotifyScriptType.Pause:
      await runScript(buildScriptEnsuringSpotifyIsRunning("pause"));
      break;
    case SpotifyScriptType.NextTrack:
      await runScript(buildScriptEnsuringSpotifyIsRunning("next track"));
      break;
    case SpotifyScriptType.PreviousTrack:
      await runScript(buildScriptEnsuringSpotifyIsRunning("previous track"));
      break;
    case SpotifyScriptType.PlayTrack:
      await runScript(buildScriptEnsuringSpotifyIsRunning(`play track "${uriOrVolume}"`));
      break;
    case SpotifyScriptType.SetVolume:
      await runScript(buildScriptEnsuringSpotifyIsRunning(`set sound volume to ${uriOrVolume}`));
      break;
    case SpotifyScriptType.SetPosition:
      await runScript(buildScriptEnsuringSpotifyIsRunning(`set player position to ${uriOrVolume}`));
      break;
    default:
      break;
  }
}
