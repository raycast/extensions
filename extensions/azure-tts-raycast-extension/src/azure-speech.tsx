import { showToast, Toast, getSelectedText, closeMainWindow, getPreferenceValues, trash } from "@raycast/api";
import * as speechsdk from "microsoft-cognitiveservices-speech-sdk";
import { exec } from "child_process";
import { promisify } from "util";
import * as os from "os";
import * as path from "path";
import { showFailureToast } from "@raycast/utils";

const execAsync = promisify(exec);

export default async function Command() {
  const preferences = getPreferenceValues<Preferences.AzureSpeech>();
  const { speechKey, serviceRegion, voiceName } = preferences;
  try {
    // Close Raycast window
    await closeMainWindow();

    // Get selected text
    const selectedText = await getSelectedText();
    console.log("Selected text:", selectedText);

    if (!selectedText.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Text Selected",
      });
      return;
    }

    await showToast({
      style: Toast.Style.Animated,
      title: "Synthesizing speech...",
    });

    // Configure speech service
    const speechConfig = speechsdk.SpeechConfig.fromSubscription(speechKey, serviceRegion);
    speechConfig.speechSynthesisVoiceName = voiceName;

    // Generate temporary file path
    const tempDir = os.tmpdir();
    const audioFile = path.join(tempDir, `azure-tts-${Date.now()}.wav`);

    // Configure audio output to file
    const audioConfig = speechsdk.AudioConfig.fromAudioFileOutput(audioFile);
    const synthesizer = new speechsdk.SpeechSynthesizer(speechConfig, audioConfig);

    // Wrap speech synthesis and playback in Promise
    await new Promise<void>((resolve, reject) => {
      synthesizer.speakTextAsync(
        selectedText,
        async (result) => {
          console.log("Synthesis result:", result.reason);
          synthesizer.close();

          if (result.reason === speechsdk.ResultReason.SynthesizingAudioCompleted) {
            console.log("Speech synthesis successful, starting playback");

            try {
              await showToast({
                style: Toast.Style.Animated,
                title: "Playing...",
              });

              // Play audio using afplay
              // Play audio using platform-specific command
              const playCommand =
                process.platform === "darwin"
                  ? `afplay "${audioFile}"`
                  : `powershell -c (New-Object Media.SoundPlayer "${audioFile}").PlaySync()`;
              await execAsync(playCommand);

              console.log("Playback completed");
              await showToast({
                style: Toast.Style.Success,
                title: "Playback Completed",
              });

              // Clean up temporary file
              await trash(audioFile).catch(() => {
                // Ignore deletion errors
              });

              resolve();
            } catch (playError) {
              console.error("Playback error:", playError);
              await showToast({
                style: Toast.Style.Failure,
                title: "Playback Failed",
                message: String(playError),
              });
              reject(playError);
            }
          } else if (result.reason === speechsdk.ResultReason.Canceled) {
            const cancellation = speechsdk.CancellationDetails.fromResult(result);
            console.log("Cancellation reason:", cancellation.reason);
            console.log("Error details:", cancellation.errorDetails);
            await showToast({
              style: Toast.Style.Failure,
              title: "Synthesis Failed",
              message: `${cancellation.reason}: ${cancellation.errorDetails}`,
            });
            reject(new Error(cancellation.errorDetails));
          } else {
            console.log("Other result:", result.errorDetails);
            await showToast({
              style: Toast.Style.Failure,
              title: "Synthesis Failed",
              message: result.errorDetails,
            });
            reject(new Error(result.errorDetails));
          }
        },
        async (error) => {
          synthesizer.close();
          await showFailureToast(error, { title: "Error Occurred" });
          reject(error);
        },
      );
    });
  } catch (error) {
    await showFailureToast(error, { title: "Error Occurred" });
  }
}
