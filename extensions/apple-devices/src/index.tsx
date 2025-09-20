import React, { useEffect, useState } from "react";
import { Icon, List } from "@raycast/api";
import { Device, Simulator } from "./types";
import { getAvailableSimulators, getDeviceById, getDevices, getSimulatorUdId } from "./utils";
import DeviceDetail from "./components/device-detail";
import SearchBar from "./components/searchbar";
import ItemActionPanel from "./components/item-action-panel";

export default function Command() {
  const [loading, setLoading] = useState<boolean>(true);
  const [showImage, setShowImage] = useState<boolean>(true);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>();
  const [availableSimulators, setAvailableSimulators] = useState<Simulator[]>();
  const [filterDeviceType, setFilterDeviceType] = useState<string>();

  const devicesGroups = getDevices(filterDeviceType);
  const selectedDevice: Device | undefined = getDeviceById(selectedDeviceId);

  useEffect((): void => {
    getAvailableSimulators()
      .then((simulators): void => {
        setAvailableSimulators(simulators);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  return (
    <List
      isLoading={loading}
      isShowingDetail={selectedDeviceId !== undefined}
      searchBarPlaceholder="Filter by name..."
      searchBarAccessory={<SearchBar onChange={setFilterDeviceType} />}
      onSelectionChange={(id) => {
        id && selectedDeviceId && setSelectedDeviceId(id);
      }}
    >
      {!loading &&
        Object.entries(devicesGroups)
          .reverse()
          .map(([year, devices]) => (
            <List.Section key={year} title={year}>
              {devices.map((device: Device) => {
                const simulatorId = getSimulatorUdId(device.identifier, availableSimulators);

                return (
                  <List.Item
                    id={device.identifier}
                    key={device.identifier}
                    icon={device.image}
                    title={`${device.device} ${device.model}`}
                    keywords={[device.resolution, device.year.toString(), simulatorId ? "simulator" : ""]}
                    accessories={[
                      { icon: simulatorId ? Icon.Play : null, tooltip: "Simulator" },
                      { text: selectedDeviceId === undefined ? device.resolution : undefined },
                    ]}
                    detail={<DeviceDetail selectedDevice={selectedDevice} showImage={showImage} />}
                    actions={
                      <ItemActionPanel
                        identifier={device.identifier}
                        selectedDeviceId={selectedDeviceId}
                        showImage={showImage}
                        simulatorId={simulatorId}
                        onToggleDetails={setSelectedDeviceId}
                        onToggleImage={setShowImage}
                      />
                    }
                  />
                );
              })}
            </List.Section>
          ))}
    </List>
  );
}
