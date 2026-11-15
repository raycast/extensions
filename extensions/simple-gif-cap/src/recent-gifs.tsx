import { Action, ActionPanel, Grid, Icon, launchCommand, LaunchType } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { CaptureActions } from "./components/CaptureActions";
import { CaptureDetail } from "./components/CaptureDetail";
import { formatSeconds, formatSize } from "./lib/encode";
import { convertPendingRecordings, trimmedDuration } from "./lib/capture";
import { listCaptures } from "./lib/history";

function RecordActions() {
  const record = (name: string) => () => launchCommand({ name, type: LaunchType.UserInitiated });

  return (
    <ActionPanel>
      <Action title="Record Region" icon={Icon.Maximize} onAction={record("record-region")} />
      <Action title="Record Window" icon={Icon.AppWindow} onAction={record("record-window")} />
      <Action title="Record Screen" icon={Icon.Desktop} onAction={record("record-screen")} />
    </ActionPanel>
  );
}

export default function Command() {
  const {
    data: captures = [],
    isLoading,
    mutate,
    revalidate,
  } = usePromise(async () => {
    await convertPendingRecordings();

    return listCaptures();
  });
  const refresh = () => {
    void mutate(listCaptures());
  };

  return (
    <Grid
      columns={4}
      aspectRatio="16/9"
      fit={Grid.Fit.Contain}
      isLoading={isLoading}
      searchBarPlaceholder="Search GIFs"
    >
      <Grid.EmptyView
        icon={Icon.Video}
        title="No GIFs yet"
        description="Record one to see it here."
        actions={<RecordActions />}
      />
      {captures.map((capture) => (
        <Grid.Item
          key={capture.id}
          content={{ source: capture.gifPath }}
          title={new Date(capture.createdAt).toLocaleString()}
          subtitle={`${formatSize(capture.size ?? 0)} - ${formatSeconds(trimmedDuration(capture))}`}
          keywords={[capture.gifPath]}
          actions={
            <CaptureActions
              capture={capture}
              onUpdate={refresh}
              detail={
                <Action.Push
                  title="Open Preview"
                  icon={Icon.Eye}
                  target={<CaptureDetail capture={capture} nested onUpdate={() => revalidate()} />}
                />
              }
            />
          }
        />
      ))}
    </Grid>
  );
}
