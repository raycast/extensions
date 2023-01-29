import { ActionPanel, Action, Icon, List, showHUD } from "@raycast/api";
import { transferPlaybackToDevice } from "../spotify/client";
import { getPreferenceValues } from "@raycast/api";

export default function PlaybackDeviceItem({ device: spotifyUserDevice }: { device: SpotifyApi.UserDevice }) {
  const device = spotifyUserDevice as UserDevice;
  return (
    <List.Item
      title={device.name}
      icon={getDeviceTypeIcon(device)}
      accessories={[
        device.is_active ? { text: "Active", icon: Icon.Play } : {},
        device.volume_percent === 0 ? { text: "Muted", icon: Icon.SpeakerOff } : {},
        device.is_private_session ? { text: "Private Session", icon: Icon.EyeDisabled } : {},
        device.is_restricted ? { text: "Restricted", icon: Icon.ExclamationMark } : {},
      ]}
      actions={
        <ActionPanel>
          <Action
            title={`Transfer playback to ${device.name}`}
            icon={Icon.ArrowRight}
            onAction={() => transferTo(device)}
          />
        </ActionPanel>
      }
    />
  );
}

// NOTE: Property 'is_private_session' is currently missing in the type definitions.
// See: https://github.com/DefinitelyTyped/DefinitelyTyped/pull/64139
interface UserDevice extends SpotifyApi.UserDevice {
  is_private_session: boolean;
}

interface Preferences {
  ensurePlayback?: boolean;
  enableDeviceTypeIcons: boolean;
}

function getPreferences(): Required<Preferences> {
  const { ensurePlayback, enableDeviceTypeIcons } = getPreferenceValues<Preferences>();
  return {
    ensurePlayback: ensurePlayback ?? true,
    enableDeviceTypeIcons: enableDeviceTypeIcons ?? true,
  };
}

const preferences = getPreferences();

async function transferTo(device: UserDevice, options?: SpotifyApi.TransferPlaybackParameterObject): Promise<void> {
  const play = options?.play ?? preferences.ensurePlayback;

  await transferPlaybackToDevice(device, { play });
  showHUD(`🔈 Transferred playback to ${device.name}`);
}

const FallbackIcon = Icon.Music;
const DeviceIcons: Readonly<Record<string, Icon>> = {
  Computer: Icon.Monitor,
  Smartphone: Icon.Mobile,
  Tablet: Icon.Mobile,
  Speaker: Icon.SpeakerOn,
  TV: Icon.Music,
  AVR: Icon.Music,
  GameConsole: Icon.GameController,
  // NOTE: The following type names are guesses, there does not seem to be a
  // definitive list (see comment below)
  AudioDongle: Icon.MemoryStick,
  Automobile: Icon.Car,
  // STB: ?
  // CastVideo: ?
  // CastAudio: ?
} as const;

function getDeviceTypeIcon(device: UserDevice): Icon | undefined {
  if (preferences.enableDeviceTypeIcons) {
    return DeviceIcons[device.type] ?? FallbackIcon;
  }
}

/*

Available types: (ref: https://github.com/spotify/web-api/issues/687)

computer:      Laptop or desktop computer device
tablet:        Tablet PC device
smartphone:    Smartphone device
speaker:       Speaker device
tv:            Television device
avr:           Audio/Video receiver device
stb:           Set-Top Box device
audio_dongle:  Audio dongle device
game_console:  Game console device
cast_video:    Chromecast device
cast_audio:    Cast for audio device
automobile:    Car device

NOTE: The API reference and the github issue mentioned above show these keys
as snake_case, but in the API responses they appear to use PascalCase.

*/
