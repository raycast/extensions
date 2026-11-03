import { Action, ActionPanel, Detail, Icon, LaunchProps, openExtensionPreferences } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { CaptureDetail } from "./components/CaptureDetail";
import { convertPendingRecordings, createCapture, RecordingFailedError } from "./lib/capture";
import { MissingToolError } from "./lib/encode";
import { Capture, findByMovie, listCaptures } from "./lib/history";
import { PreviewContext } from "./lib/recording";

// Raycast can mount the command twice for one launch; encode each recording once.
const pending = new Map<string, Promise<Capture>>();

async function load(context?: PreviewContext) {
  if (!context?.moviePath) {
    await convertPendingRecordings();

    return (await listCaptures())[0];
  }

  const existing = await findByMovie(context.moviePath);
  if (existing) {
    return existing;
  }

  let job = pending.get(context.moviePath);
  if (!job) {
    job = createCapture(context.moviePath, context.createdAt);
    pending.set(context.moviePath, job);
  }

  return job;
}

function ErrorView(props: { error: Error }) {
  const { error } = props;
  const permission = error instanceof RecordingFailedError;
  const lines = [
    "# Could not make the GIF",
    error.message,
    permission
      ? "Open **System Settings > Privacy & Security > Screen & System Audio Recording** and enable Raycast."
      : "",
  ];

  return (
    <Detail
      markdown={lines.join("\n\n")}
      actions={
        <ActionPanel>
          {permission && (
            <Action.Open
              title="Open Privacy Settings"
              icon={Icon.Lock}
              target="x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"
            />
          )}
          {error instanceof MissingToolError && (
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          )}
        </ActionPanel>
      }
    />
  );
}

/** Opened by the recorder when a recording ends, or by hand to see the last GIF. */
export default function Command(props: LaunchProps<{ launchContext?: PreviewContext }>) {
  const { data: capture, isLoading, error } = usePromise(load, [props.launchContext]);

  if (error) {
    return <ErrorView error={error} />;
  }

  if (isLoading) {
    return <Detail isLoading markdown={props.launchContext ? "Converting to GIF..." : ""} />;
  }

  if (!capture) {
    return <Detail markdown={"# No GIFs yet\n\nRun **Record GIF of Region**, **Window** or **Screen** to make one."} />;
  }

  return <CaptureDetail capture={capture} />;
}
