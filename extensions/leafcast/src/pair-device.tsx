import { PairDeviceScreen } from "./components/PairDeviceScreen";
import { SetDeviceAddressForm } from "./components/SetDeviceAddressForm";
import { useDeviceApi } from "./hooks/use-device-api";

export default function Command() {
  const { deviceAddress, pairDevice, setDeviceAddress } = useDeviceApi();

  return deviceAddress ? (
    <PairDeviceScreen
      deviceAddress={deviceAddress}
      pairDevice={pairDevice}
      onChangeAddress={() => setDeviceAddress("")}
    />
  ) : (
    <SetDeviceAddressForm onSetDeviceAddress={setDeviceAddress} />
  );
}
