import { useEffect, useState } from "react";
import { Detail } from "@raycast/api";
import { DeviceDetails, listDevices } from "./adbUtils";

export const DeviceInfoDetails = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [devices, setDevices] = useState<DeviceDetails[] | null>();

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const devices = await listDevices();
        setDevices(devices)
        setLoading(false)
      } catch (error) {
        setLoading(false)
        console.log(error);
      }
    }
    loadData()
  }, [])

  const metadatas: JSX.Element[] = []
  metadatas.push(<Detail.Metadata.Label key="title" title="Connected Devices" />)
  devices?.map((device, index) => {
    metadatas.push(<Detail.Metadata.Label key={device.id} title="Device id" text={device.id} />)
    metadatas.push(<Detail.Metadata.Label key={device.model} title="Device model" text={device.model} />)
    if (index != (devices.length - 1)) {
      metadatas.push(<Detail.Metadata.Separator key={`${device.id}divider`} />)
    }
  });

  return <Detail
    isLoading={loading}
    metadata={
      <Detail.Metadata
        children={metadatas} />
    } />
}
