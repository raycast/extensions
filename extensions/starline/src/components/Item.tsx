import { List } from "@raycast/api";

import DevicesItemContext from "./context/deviceItem";
import DevicesItemActionPanel from "./DeviceItemPanel";
import useItemAccessories from "./useItemAccessories";
import { deviceTitle } from "../utils/format";

import type { Item } from "../types/devices";

type DevicesItemProps = {
    item: Item;
};

function DevicesItem({ item }: DevicesItemProps) {
    const accessories = useItemAccessories(item);
    const engineStatus = item.car_state.run ? "Engine started" : "Engine stopped";
    const subtitle = `${engineStatus}, Inside temp: ${item.ctemp}°C / Engine temp: ${item.etemp}°C`;

    return (
        <DevicesItemContext.Provider value={item}>
            <List.Item
                id={item.device_id.toString()}
                title={deviceTitle(item)}
                subtitle={subtitle}
                actions={<DevicesItemActionPanel />}
                accessories={accessories}
            />
        </DevicesItemContext.Provider>
    );
}

export default DevicesItem;
