import { Color, Icon } from "@raycast/api";

import type { Item } from "../types/devices";
import type { List } from "@raycast/api";

type ListItemAccessory = NonNullable<List.Item.Props["accessories"]>[number];

const stateIcon = (enabled: boolean, enabledIcon: Icon, disabledIcon: Icon, tooltip: string) => ({
    icon: {
        source: enabled ? enabledIcon : disabledIcon,
        tintColor: enabled ? Color.Green : Color.Red,
    },
    tooltip,
});

export default function useItemAccessories(item: Item): ListItemAccessory[] {
    const accessories: ListItemAccessory[] = [];

    if (item.default === true) {
        accessories.push({
            icon: { source: Icon.Star, tintColor: Color.Yellow },
            tooltip: "Default device",
        });
    }

    accessories.push(
        stateIcon(item.car_state.arm, Icon.Lock, Icon.LockUnlocked, item.car_state.arm ? "Armed" : "Disarmed"),
        stateIcon(item.car_state.run, Icon.Play, Icon.Stop, item.car_state.run ? "Engine running" : "Engine stopped"),
    );

    return accessories;
}
