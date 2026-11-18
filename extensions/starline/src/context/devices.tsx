import { Toast, showToast } from "@raycast/api";
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from "react";

import { CaptchaNeededError, getErrorMessage } from "../utils/errors";

import { useStarLine } from "./starline";

import type { Devices, Item } from "../types/devices";
import type { ReactNode } from "react";

type DevicesState = Devices & {
    isLoading: boolean;
    captchaSid?: string;
    captchaImg?: string;
};

type DevicesStatePatch = Partial<DevicesState>;
type DevicesStateUpdate = DevicesStatePatch | ((state: DevicesState) => DevicesStatePatch);

type DevicesContextType = DevicesState & {
    loadItems: () => Promise<void>;
    updateState: (next: DevicesStateUpdate) => void;
    setDefaultDevice: (item: Item, enabled: boolean) => void;
};

const INITIAL_STATE: DevicesState = {
    devices: [],
    isLoading: true,
    shared_devices: [],
    code: 200,
    codestring: "",
};

const DevicesContext = createContext<DevicesContextType | null>(null);

export function DevicesProvider({ children }: { children: ReactNode }) {
    const starline = useStarLine();
    const [state, dispatch] = useReducer(
        (previous: DevicesState, next: DevicesStateUpdate) => ({
            ...previous,
            ...(typeof next === "function" ? next(previous) : next),
        }),
        INITIAL_STATE,
    );

    const loadItems = useCallback(async () => {
        dispatch({ isLoading: true });

        try {
            const { result } = await starline.getDevices();
            dispatch({ ...result, captchaImg: undefined, captchaSid: undefined });
        } catch (error) {
            if (error instanceof CaptchaNeededError) {
                dispatch({ captchaImg: error.captchaImg, captchaSid: error.captchaSid });
                return;
            }

            await showToast(Toast.Style.Failure, "Failed to load devices", getErrorMessage(error));
        } finally {
            dispatch({ isLoading: false });
        }
    }, [starline]);

    const setDefaultDevice = useCallback((item: Item, enabled: boolean) => {
        dispatch(({ devices }) => ({
            devices: devices.map((device) => ({
                ...device,
                default: enabled && device.device_id === item.device_id,
            })),
        }));
    }, []);

    useEffect(() => {
        void loadItems();
    }, [loadItems]);

    const value = useMemo(
        () => ({
            ...state,
            loadItems,
            updateState: dispatch,
            setDefaultDevice,
        }),
        [loadItems, setDefaultDevice, state],
    );

    return <DevicesContext.Provider value={value}>{children}</DevicesContext.Provider>;
}

export const useOptionalDevicesContext = () => useContext(DevicesContext);

export const useDevicesContext = () => {
    const context = useOptionalDevicesContext();
    if (context === null) {
        throw new Error("useDevices must be used within a DevicesProvider");
    }

    return context;
};
