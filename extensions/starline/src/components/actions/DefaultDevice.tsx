import { Action, Icon, LocalStorage, Toast, showToast } from "@raycast/api";

import { useOptionalDevicesContext } from "../../context/devices";
import { LOCAL_STORAGE } from "../../starline/constants";
import { useSelectedDeviceItem } from "../context/deviceItem";

export default function DefaultDeviceAction({ isDefault }: { isDefault: boolean }) {
    const item = useSelectedDeviceItem();
    const devicesContext = useOptionalDevicesContext();
    const title = isDefault ? "Unset as Default Device" : "Set as Default Device";

    const handleAction = async () => {
        if (isDefault) {
            await LocalStorage.removeItem(LOCAL_STORAGE.DEFAULT_DEVICE);
        } else {
            await LocalStorage.setItem(LOCAL_STORAGE.DEFAULT_DEVICE, item.device_id.toString());
        }

        devicesContext?.setDefaultDevice(item, !isDefault);
        await showToast(Toast.Style.Success, `Device "${item.alias}" ${isDefault ? "unset" : "set"} as default`);
    };

    return <Action title={title} icon={Icon.Star} onAction={handleAction} />;
}
