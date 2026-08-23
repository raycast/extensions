import { createContext, useContext } from "react";

import type { Item } from "../../types/devices";

const DevicesItemContext = createContext<Item | null>(null);

export const useSelectedDeviceItem = () => {
    const session = useContext(DevicesItemContext);
    if (session === null) {
        throw new Error("useSelectDeviceItem must be used within a DeviceItemContext.Provider");
    }

    return session;
};

export default DevicesItemContext;
