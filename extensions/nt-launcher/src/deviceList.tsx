import { List, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { DeviceDetails, installApk, listDevices } from "./adbUtils";
import { LaunchAppScreen } from "./launchScreen";

export interface DeviceListProps {
  apkPath: string,
  packageName: string
}

export const DeviceList = (props: DeviceListProps) => {
  const { apkPath, packageName } = props;
  const { push } = useNavigation()

  const [loading, setLoading] = useState<boolean>(true);
  const [devices, setDevices] = useState<DeviceDetails[]>();

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const devices = await listDevices();
        setLoading(false)
        setDevices(devices)
        await showToast({
          style: Toast.Style.Animated,
          title: `Select device to install app onto`,
        });
      } catch (error) {
        setLoading(false)
        console.log(error);
      }
    }
    fetchData()
  }, [])



  return (
    <List navigationTitle="Select device to install app onto" isLoading={loading} >
      {devices?.map(
        device => {
          return <List.Item
            key={device.id}
            title={device.model}
            actions={
              <ActionPanel >
                <Action
                  title="Install"
                  onAction={async () => {
                    const toast = await showToast({
                      style: Toast.Style.Animated,
                      title: `Installing on ${device.model}...`,
                    });
                    setLoading(false)
                    await installApk(apkPath, device.id)
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
                  }
                  }
                />
              </ActionPanel>
            }
          />
        }
      )
      }
    </List>
  )
};