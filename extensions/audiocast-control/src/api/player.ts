import unescape from "lodash.unescape";
import { URL } from "node:url";
import { get } from "./request";
import { getAgent } from "./mtlsAgent";
import { getCurrentSong } from "./radio";
import { getSpotifyTrackInfo } from "./playerUPnP";
import { createLog } from "../lib/debug";
import { cache } from "../lib/cache";
import { fromHexToString } from "../lib/hex";
import { roundToFive } from "../lib/roundToFive";
import { type RequestOptions } from "https";
import { rssiToSignalStrength, type SignalStrength } from "../lib/rssiToSignalStrength";
const log = createLog("player");

const UNKNOWN_COMMAND_RESPONSE = "unknown command";

export class UnknownCommandError extends Error {
  constructor(command: DeviceCommand, commandArgument?: string) {
    super(`Unknown command: ${command}${commandArgument ? `:${commandArgument}` : ""}`);
  }
}

export enum DeviceCommand {
  GET_STATUS = "getStatus",
  GET_STATUS_EX = "getStatusEx",
  GET_PLAYER_STATUS = "getPlayerStatus",
  REBOOT = "reboot",
  SET_PLAYER_CMD = "setPlayerCmd",
}

async function command<R = void>(
  url: string,
  command: DeviceCommand,
  commandArgument?: string,
  options?: RequestOptions,
): Promise<R> {
  const { data, status } = await get<R>(
    `${url}/httpapi.asp`,
    { command: `${command}${commandArgument ? `:${commandArgument}` : ""}` },
    url.startsWith("https://") ? { ...options, agent: getAgent() } : options,
  );

  if (data === UNKNOWN_COMMAND_RESPONSE) {
    throw new UnknownCommandError(command, commandArgument);
  }

  log.log(`Command '${command}' executed with status ${status}`);

  return data;
}

interface Status {
  uuid: string;
  DeviceName: string;
  GroupName: string;
  ssid: string;
  language: string;
  firmware: string;
  hardware: string;
  build: string;
  project: string;
  priv_prj: string;
  project_build_name: string;
  Release: string;
  temp_uuid: string;
  hideSSID: string;
  SSIDStrategy: string;
  branch: string;
  group: string;
  wmrm_version: string;
  internet: string;
  MAC: string;
  STA_MAC: string;
  CountryCode: string;
  CountryRegion: string;
  netstat: string;
  essid: string;
  apcli0: string;
  eth2: string;
  ra0: string;
  eth_dhcp: string;
  VersionUpdate: string;
  NewVer: string;
  set_dns_enable: string;
  mcu_ver: string;
  mcu_ver_new: string;
  dsp_ver: string;
  dsp_ver_new: string;
  date: string;
  time: string;
  tz: string;
  dst_enable: string;
  region: string;
  prompt_status: string;
  iot_ver: string;
  upnp_version: string;
  cap1: string;
  capability: string;
  languages: string;
  streams_all: string;
  streams: string;
  external: string;
  plm_support: string;
  preset_key: string;
  spotify_active: string;
  lbc_support: string;
  privacy_mode: string;
  WifiChannel: string;
  RSSI: string;
  BSSID: string;
  battery: string;
  battery_percent: string;
  securemode: string;
  auth: string;
  encry: string;
  upnp_uuid: string;
  uart_pass_port: string;
  communication_port: string;
  web_firmware_update_hide: string;
  ignore_talkstart: string;
  web_login_result: string;
  silenceOTATime: string;
  ignore_silenceOTATime: string;
  new_tunein_preset_and_alarm: string;
  iheartradio_new: string;
  new_iheart_podcast: string;
  tidal_version: string;
  service_version: string;
  ETH_MAC: string;
  security: string;
  security_version: string;
}

export interface StatusSummary {
  /**
   * Device name
   */
  deviceName: string;
  /**
   * Device URL
   */
  url: string;
  /**
   * SSID of the connected network
   */
  ssid: string;
  /**
   * Signal strength in dBm
   */
  signalStrength: number | null;
  /**
   * Signal strength level: from 1 (Poor) to 4 (Excellent)
   */
  signalStrengthLevel: SignalStrength | null;
}

/**
 * Obtain basic information about the device, such as ssid, the version of Equipment, IP wifi and IP Ethernet, etc.
 * @link https://github.com/AndersFluur/LinkPlayApi/blob/master/api.md#get-information
 */
export async function getStatus(url: string, signal?: AbortSignal): Promise<StatusSummary> {
  let status: Status;

  try {
    status = await command<Status>(url, DeviceCommand.GET_STATUS_EX, undefined, { signal });
  } catch (error) {
    if (error instanceof UnknownCommandError) {
      log.log("getStatusEx not supported");

      status = await command<Status>(url, DeviceCommand.GET_STATUS, undefined, { signal });
    }
  }

  const signalStrength = parseInt(status!.RSSI, 10) || null;

  return {
    url,
    deviceName: status!.DeviceName,
    ssid: fromHexToString(status!.essid),
    signalStrength,
    signalStrengthLevel: signalStrength ? rssiToSignalStrength(signalStrength) : null,
  };
}

interface PlayerStatus {
  type: string;
  ch: string;
  mode: string;
  loop: string;
  eq: string;
  status: string;
  curpos: string;
  offset_pts: string;
  totlen: string;
  Title: string;
  Artist: string;
  Album: string;
  alarmflag: string;
  plicount: string;
  plicurr: string;
  vol: string;
  mute: string;
}

export const enum PlayerMode {
  Radio = 10,
  Spotify = 31,
}

export const enum PlaybackState {
  Load = "load",
  None = "none",
  Pause = "pause",
  Play = "play",
  Stop = "stop",
}

export interface PlayerStatusSummary {
  title: string;
  status: PlaybackState;
  isPlaying: boolean;
  isStopped: boolean;
  volume: number;
  muted: boolean;
  mode: PlayerMode;
}
/**
 * Return Player status
 * @link https://github.com/AndersFluur/LinkPlayApi/blob/master/api.md#reading-status
 * @param {string} url - Device URL
 * @param {AbortSignal} [signal] - AbortController signal to stop fetching
 * @returns {Promise<PlayerStatusSummary>} Player status
 */
export async function getPlayerStatus(url: string, signal?: AbortSignal): Promise<PlayerStatusSummary> {
  const playerStatus = await command<PlayerStatus>(url, DeviceCommand.GET_PLAYER_STATUS, undefined, { signal });
  const isStopped = playerStatus.status === PlaybackState.Stop || playerStatus.status === PlaybackState.None;

  const data = {
    title:
      !isStopped && playerStatus.Title
        ? URL.canParse(playerStatus.Title)
          ? playerStatus.Title
          : unescape(fromHexToString(playerStatus.Title))
        : "",
    status: <PlaybackState>playerStatus.status,
    volume: parseInt(playerStatus.vol, 10),
    mode: parseInt(playerStatus.mode, 10),
    isPlaying: playerStatus.status === PlaybackState.Play,
    isStopped: playerStatus.status === PlaybackState.Stop || playerStatus.status === PlaybackState.None,
    muted: playerStatus.mute === "1",
  };

  log.log("Return data:", data);

  return data;
}

enum PlayerSubCommand {
  /**
   * Add URI to playback queue Pause
   * @example http://$ReceiverIpAddress/httpapi.asp?command=setPlayerCmd:play:<URI>
   */
  PLAY = "play",
  /**
   * Pause current playback
   * @example http://$ReceiverIpAddress/httpapi.asp?command=setPlayerCmd:pause
   */
  PAUSE = "pause",
  /**
   * Resume playback
   * @example http://$ReceiverIpAddress/httpapi.asp?command=setPlayerCmd:resume
   */
  RESUME = "resume",
  /**
   * If it is pasued it will resume, if playing it gets paused
   * @example http://$ReceiverIpAddress/httpapi.asp?command=setPlayerCmd:onepause
   */
  ONE_PAUSE = "onepause",
  /**
   * Stops the current playback
   * @example http://$ReceiverIpAddress/httpapi.asp?command=setPlayerCmd:stop
   */
  STOP = "stop",
  /**
   * Allows you to play back the next song
   * @example http://$ReceiverIpAddress/httpapi.asp?command=setPlayerCmd:next
   */
  NEXT = "next",
  /**
   * Allows you to play back a previous song
   * @example http://$ReceiverIpAddress/httpapi.asp?command=setPlayerCmd:prev
   */
  PREV = "prev",
  /**
   * Adjusting the volume of the player, the value is one volume value of 0-100. Speakers will also change the volume Main and under loudspeaker
   * @example http://$ReceiverIpAddress/httpapi.asp?command=setPlayerCmd:vol:<value>
   */
  VOL = "vol",
  /**
   * Enable Mute mode (1 = muted) (0 = unmuted)
   * @example http://$ReceiverIpAddress/httpapi.asp?command=setPlayerCmd:mute:<mute_mode>
   */
  MUTE = "mute",
}

async function setPlayerCommand(
  ip: string,
  subCommand: PlayerSubCommand,
  subCommandArgument?: string,
  signal?: AbortSignal,
): Promise<void> {
  log.log(`${subCommand}${subCommandArgument ? ` with argument '${subCommandArgument}'` : ""}`);

  await command<"OK">(
    ip,
    DeviceCommand.SET_PLAYER_CMD,
    `${subCommand}${subCommandArgument ? `:${subCommandArgument}` : ""}`,
    { signal },
  );
}

export async function togglePlayPause(url: string, signal?: AbortSignal): Promise<void> {
  await setPlayerCommand(url, PlayerSubCommand.ONE_PAUSE, undefined, signal);
}

export async function stop(url: string, signal?: AbortSignal): Promise<void> {
  await setPlayerCommand(url, PlayerSubCommand.STOP, undefined, signal);
}

export async function setVolume(url: string, volume: number, signal?: AbortSignal): Promise<void> {
  await setPlayerCommand(url, PlayerSubCommand.VOL, volume.toString(), signal);
}

export async function volumeUp(url: string, signal?: AbortSignal): Promise<number> {
  const { volume } = await getPlayerStatus(url, signal);
  const newVolume = Math.min(100, roundToFive(volume + 5));

  await setVolume(url, newVolume, signal);

  return newVolume;
}

export async function volumeDown(url: string, signal?: AbortSignal): Promise<number> {
  const { volume } = await getPlayerStatus(url, signal);
  const newVolume = Math.max(0, roundToFive(volume - 5));

  await setVolume(url, newVolume, signal);

  return newVolume;
}

/**
 * Mute/Unmute the player
 * @param {string} url - Device URL
 * @param {AbortSignal} [signal] - AbortController signal to stop fetching
 * @returns {Promise<boolean>} True - if device is muted, False - otherwise
 */
export async function toggleMute(url: string, signal?: AbortSignal): Promise<boolean> {
  const { muted } = await getPlayerStatus(url, signal);

  await setPlayerCommand(url, PlayerSubCommand.MUTE, muted ? "0" : "1", signal);

  return !muted;
}

export async function playUrl(url: string, mediaUrl: string, signal?: AbortSignal): Promise<void> {
  await setPlayerCommand(url, PlayerSubCommand.PLAY, mediaUrl, signal);

  if (URL.canParse(mediaUrl)) {
    cache.lastPlayedRadioUrl = mediaUrl;
  }
}

export async function reboot(url: string, signal?: AbortSignal): Promise<void> {
  await command(url, DeviceCommand.REBOOT, undefined, { signal });
}

/**
 * Get detailed playback information for the currently playing track.
 * Enriches the raw player status with radio metadata or Spotify track info.
 */
export async function getPlaybackStatus(url: string, signal?: AbortSignal): Promise<RecordingSummary | null> {
  const raw = await command<PlayerStatus>(url, DeviceCommand.GET_PLAYER_STATUS, undefined, { signal });

  if (raw.status === PlaybackState.Stop || raw.status === PlaybackState.None) {
    return null;
  }

  const rawTitle = raw.Title ? (URL.canParse(raw.Title) ? raw.Title : unescape(fromHexToString(raw.Title))) : "";
  const rawArtist = raw.Artist ? unescape(fromHexToString(raw.Artist)) : "";
  const rawAlbum = raw.Album ? unescape(fromHexToString(raw.Album)) : "";
  const mode = parseInt(raw.mode, 10);

  const defaultRecording: RecordingSummary = {
    id: "",
    title: rawTitle,
    artist: rawArtist,
    album: rawAlbum,
    length: "",
    date: "",
    coverArt: null,
  };

  if (mode === PlayerMode.Radio) {
    const radioUrl = URL.canParse(rawTitle) ? rawTitle : cache.lastPlayedRadioUrl;

    if (radioUrl) {
      return (await getCurrentSong(radioUrl, signal)) || defaultRecording;
    }
  }

  if (mode === PlayerMode.Spotify && cache.deviceUpnpPort) {
    return (await getSpotifyTrackInfo(new URL(url).hostname, cache.deviceUpnpPort, signal)) || defaultRecording;
  }

  return defaultRecording;
}
