import { ActionPanel, Toast, showToast, List, Action, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { GithubArtifactDetails } from "./githubTypes";
import { listArtifacts } from "./githubApi";
import { downloadFile } from "./downloadFile";
import { unzipFile } from "./unzip";
import os from "os";
import checkAdbExists, { installApk, listDevices } from "./adbUtils";
import { DeviceList } from "./deviceList";
import { LaunchAppScreen } from "./launchScreen";

export interface ArtifactListProps {
  appType: string,
  packageName: string
}

export const ArtifactList = (props: ArtifactListProps) => {
  const { appType, packageName } = props;

  const { push } = useNavigation()

  const [loading, setLoading] = useState<boolean>(true);
  const [showingDetail, setShowingDetail] = useState<boolean>(false);
  const [artifacts, setArtifacts] = useState<GithubArtifactDetails[]>();

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        checkAdbExists()
        const response = await listArtifacts();
        setLoading(false)
        setArtifacts(response.filter((a) => a.name.includes(appType)));
        console.log(artifacts);
      } catch (error) {
        setLoading(false)
        console.log(error);
      }
    }
    fetchData()
  }, [])

  return (
    <List navigationTitle="Select app version to download" isLoading={loading} isShowingDetail={showingDetail}>
      {artifacts?.map(
        artifact => {
          const props: Partial<List.Item.Props> = showingDetail
            ? {
              detail: (
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Build info" />
                      <List.Item.Detail.Metadata.Label title="Name" text={artifact.name} />
                      <List.Item.Detail.Metadata.Label title="Created at" text={artifact.created_at} />
                      <List.Item.Detail.Metadata.Label title="Expires at" text={artifact.expires_at} />
                      <List.Item.Detail.Metadata.Label title="Is expired" text={`${artifact.expired}`} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Workflow details" />
                      <List.Item.Detail.Metadata.Label title="Branch" text={`${artifact.workflow_run.head_branch}`} />
                      <List.Item.Detail.Metadata.Link title="Commit SHA" text={`${artifact.workflow_run.head_sha}`} target={`https://github.com/Norsk-Tipping/nt-android/commit/${artifact.workflow_run.head_sha}`} />
                      <List.Item.Detail.Metadata.Label title="ID" text={`${artifact.workflow_run.id}`} />
                      <List.Item.Detail.Metadata.Separator />
                    </List.Item.Detail.Metadata>
                  }
                  isLoading={loading}
                />
              ),
            }
            : { accessories: [{ text: artifact.name }] };

          return <List.Item
            key={artifact.archive_download_url}
            title={artifact.workflow_run.head_branch}
            subtitle={artifact.created_at}
            {...props}
            actions={
              <ActionPanel>
                <Action title="Toggle Detail" onAction={() => setShowingDetail(!showingDetail)} />
                <Action
                  title="Download"
                  onAction={async () => {
                    const toast = await showToast({
                      style: Toast.Style.Animated,
                      title: `Downloading ${artifact.name}...`,
                    });
                    setLoading(true)
                    const zipPath = await downloadFile(artifact.archive_download_url, "nt.zip", (mb) => {
                      toast.title = `Downloading ${artifact.name}... [${mb} MB]`;
                    });
                    toast.style = Toast.Style.Animated;
                    toast.title = `Unzipping ${zipPath}`;
                    const outputPath = `${os.homedir()}/Downloads/raycast/${artifact.name}`

                    console.log(`Zip file path: ${zipPath}`)
                    console.log(`Output path: ${outputPath}`)
                    await unzipFile(zipPath, outputPath)
                      .catch((reason) => {
                        setLoading(false)
                        toast.style = Toast.Style.Failure;
                        toast.title = `Unzip failed`;
                        toast.message = `${reason}`;
                      });
                    const devices = await listDevices()
                    const numDevices = devices.length
                    if (numDevices == 1) {
                      const device = devices[0]
                      await installApk(outputPath, device.id)
                        .then(() => {
                          toast.style = Toast.Style.Success;
                          toast.title = `Done!`;
                          setLoading(false)
                          push(<LaunchAppScreen deviceId={device.id} packageName={packageName} />)
                        }, (reason) => {
                          toast.style = Toast.Style.Failure;
                          toast.title = `ADB install failed`;
                          toast.message = `${reason}`;
                          setLoading(false)
                        })
                    } else {
                      push(<DeviceList apkPath={outputPath} packageName={packageName} />)
                    }
                  }
                  }
                />
                <Action.CopyToClipboard content={artifact.archive_download_url} />
              </ActionPanel>
            }
          />
        }
      )
      }
    </List>
  )
};