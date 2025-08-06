import { ActionPanel, Action, Icon, List, Toast, showToast, Detail, useNavigation } from "@raycast/api";
import { useEffect, useState, useCallback, useRef } from "react";
import { getAudioInputDevices, getInputVolume } from "swift:../swift";

interface AudioDevice {
  id: string;
  name: string;
  isDefault: boolean;
  type: string;
}

interface MicrophoneTestProps {
  device: AudioDevice;
}

function MicrophoneTest({ device }: MicrophoneTestProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isAudioDetected, setIsAudioDetected] = useState(false);
  const [peakLevel, setPeakLevel] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { pop } = useNavigation();

  const getSystemAudioLevel = async (): Promise<number> => {
    try {
      // Try to get real input volume using Swift Core Audio APIs
      const volume = await getInputVolume();
      // Convert from 0.0-1.0 to 0-100
      return volume * 100;
    } catch {
      // If real audio level detection fails, return 0 instead of simulation
      return 0;
    }
  };

  const toggleRecording = useCallback(async () => {
    try {
      if (!isRecording) {
        setIsRecording(true);
        setRecordingDuration(0);
        showToast({
          style: Toast.Style.Success,
          title: "🎙️ Recording started",
          message: `Testing ${device.name}`,
        });

        // Audio monitoring simulation with more realistic behavior
        const interval = setInterval(async () => {
          const level = await getSystemAudioLevel();
          setAudioLevel(level);
          setIsAudioDetected(level > 15);

          // Track peak level
          setPeakLevel((prev) => Math.max(prev, level));

          // Update duration
          setRecordingDuration((prev) => prev + 0.1);
        }, 100);

        intervalRef.current = interval;
      } else {
        setIsRecording(false);
        setAudioLevel(0);
        setIsAudioDetected(false);

        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        showToast({
          style: Toast.Style.Success,
          title: "🛑 Recording stopped",
          message: `Peak level: ${Math.floor(peakLevel)}% | Duration: ${recordingDuration.toFixed(1)}s`,
        });
      }
    } catch {
      showToast({
        style: Toast.Style.Failure,
        title: "❌ Error",
        message: `Failed to ${isRecording ? "stop" : "start"} recording`,
      });
    }
  }, [isRecording, device.name, peakLevel, recordingDuration]);

  const getAudioVisualization = () => {
    if (!isRecording) return "🎤 Press **Start Recording** to test microphone";

    if (audioLevel === 0) return "⚠️ **No audio data available** - check microphone permissions or device connection";

    if (!isAudioDetected) return "🔇 **No audio detected** - try speaking louder or check microphone settings";

    // Enhanced audio level visualization with frequency-like bars
    const bars = Math.floor(audioLevel / 5); // 20 possible bars
    const filledBars = "█".repeat(Math.min(bars, 20));
    const emptyBars = "░".repeat(Math.max(0, 20 - bars));

    // Color-coded level indication
    let levelIndicator = "";
    if (audioLevel < 30) levelIndicator = "🟢";
    else if (audioLevel < 70) levelIndicator = "🟡";
    else levelIndicator = "🔴";

    return `${levelIndicator} \`${filledBars}${emptyBars}\` **${Math.floor(audioLevel)}%**`;
  };

  const getStatusIcon = () => {
    if (!isRecording) return "🎤";
    if (!isAudioDetected) return "🔇";
    if (audioLevel < 30) return "🟢";
    if (audioLevel < 70) return "🟡";
    return "🔴";
  };

  const getDeviceStatus = () => {
    if (!isRecording) return "Ready to test";
    return `Recording: ${recordingDuration.toFixed(1)}s | Peak: ${Math.floor(peakLevel)}%`;
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  const markdown = `
# ${getStatusIcon()} ${device.name}

## Audio Level Monitor
${getAudioVisualization()}

---

## Device Information
- **Type**: ${device.type}
- **Status**: ${getDeviceStatus()}
${device.isDefault ? "- **Default Device**: ✅" : ""}

## Testing Instructions
1. **Click "Start Recording"** to begin audio monitoring
2. **Speak into your microphone** or make some noise
3. **Watch the level bars** - they should respond to your voice
4. **Green (🟢)**: Good levels | **Yellow (🟡)**: High levels | **Red (🔴)**: Too loud

${isRecording ? "### 🔴 **Live Monitoring Active**" : "### ⏹️ **Ready to Start**"}

${
  isAudioDetected
    ? `### ✅ **Audio Successfully Detected!**
Current level: **${Math.floor(audioLevel)}%** | Peak: **${Math.floor(peakLevel)}%**`
    : ""
}

${!isRecording ? "*Note: Audio levels are read from real system input devices using Core Audio APIs.*" : ""}
  `;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title={isRecording ? "Stop Recording" : "Start Recording"}
            icon={isRecording ? Icon.Stop : Icon.Play}
            onAction={toggleRecording}
          />
          <Action
            title="Back to Device List"
            icon={Icon.ArrowLeft}
            onAction={pop}
            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
          />
          {peakLevel > 0 && (
            <Action.CopyToClipboard
              title="Copy Test Results"
              content={`Microphone Test Results:
Device: ${device.name}
Duration: ${recordingDuration.toFixed(1)}s
Peak Level: ${Math.floor(peakLevel)}%
Status: ${isAudioDetected ? "Audio Detected ✅" : "No Audio Detected ❌"}`}
            />
          )}
          <Action.CopyToClipboard title="Copy Device Name" content={device.name} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  const getAudioDevices = async () => {
    try {
      setIsLoading(true);

      // Use Swift Core Audio APIs for real device detection
      try {
        const swiftDevices = await getAudioInputDevices();
        const audioDevices: AudioDevice[] = swiftDevices.map((device) => ({
          id: device.id,
          name: device.name,
          isDefault: device.isDefault,
          type: device.type,
        }));

        setDevices(audioDevices);
        if (audioDevices.length > 0) {
          showToast({
            style: Toast.Style.Success,
            title: `✅ Found ${audioDevices.length} real audio input device(s)`,
            message: "Using native Core Audio detection",
          });
        } else {
          showToast({
            style: Toast.Style.Failure,
            title: "❌ No audio input devices found",
            message: "No real audio input devices detected on this system",
          });
        }
        return;
      } catch (error) {
        console.log("Swift Core Audio detection failed:", error);
        setDevices([]);
        showToast({
          style: Toast.Style.Failure,
          title: "❌ Audio device detection failed",
          message: "Could not detect audio devices using Core Audio APIs",
        });
      }
    } catch {
      // Set empty array if all detection methods fail
      setDevices([]);
      showToast({
        style: Toast.Style.Failure,
        title: "❌ Audio device detection failed",
        message: "Unable to access audio system",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getAudioDevices();
  }, []);

  const testMicrophone = (device: AudioDevice) => {
    push(<MicrophoneTest device={device} />);
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search audio devices...">
      <List.Section title={`Audio Input Devices (${devices.length})`}>
        {devices.map((device) => (
          <List.Item
            key={device.id}
            icon={device.isDefault ? Icon.Star : Icon.Microphone}
            title={device.name}
            subtitle={`${device.type}${device.isDefault ? " • Default" : ""}`}
            accessories={[{ tag: device.type }, { icon: Icon.ChevronRight, text: "Test" }]}
            actions={
              <ActionPanel>
                <Action title="Test Microphone" icon={Icon.Play} onAction={() => testMicrophone(device)} />
                <Action
                  title="Refresh Device List"
                  icon={Icon.RotateClockwise}
                  onAction={getAudioDevices}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
                <Action.OpenWith
                  path="/System/Library/PreferencePanes/Sound.prefPane"
                  title="Open Sound Preferences"
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
                <Action.CopyToClipboard title="Copy Device Info" content={`${device.name} (${device.type})`} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {devices.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.Microphone}
          title="No audio devices found"
          description="Check your audio input devices and permissions"
          actions={
            <ActionPanel>
              <Action title="Refresh Device List" icon={Icon.RotateClockwise} onAction={getAudioDevices} />
              <Action.OpenWith path="/System/Library/PreferencePanes/Sound.prefPane" title="Open Sound Preferences" />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
