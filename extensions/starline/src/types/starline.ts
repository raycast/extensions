import type { Item } from "./devices";

type StarLineApiResponse = {
    code: number;
    codestring: string;
};

type ControlDescription = {
    title?: string;
};

export type ControlsLibraryResponse = StarLineApiResponse & {
    controls: Record<string, ControlDescription>;
};

export type DeviceStateResponse = StarLineApiResponse & {
    state: Pick<Item, "car_state" | "car_alr_state" | "balance"> & {
        position?: {
            x?: number | string;
            y?: number | string;
            ts?: number | string;
            r?: number | string;
        };
        battery?: number | string;
        ctemp?: number;
        etemp?: number;
        gps_lvl?: number;
        gsm_lvl?: number;
        mayak_temp?: number;
        mon_type?: number | string;
        status?: number | string;
        ts_activity?: number | string;
        interval?: number;
    };
};

export type DevicePositionResponse = StarLineApiResponse & {
    device: {
        position?: {
            lat?: string;
            lon?: string;
            ts?: string;
            pres?: string;
        };
    };
};

type DeviceEvent = {
    timestamp: number;
    groupId: number;
    type: number;
};

export type DeviceEventsResponse = StarLineApiResponse & {
    events: DeviceEvent[];
};

export type ObdParamsResponse = StarLineApiResponse & {
    requirements?: {
        min_version?: string;
    };
    obd_params?: {
        fuel?: {
            val?: number;
            type?: "percents" | "liters" | "unknown";
            ts?: number;
        };
        errors?: {
            val?: number;
            ts?: number;
        };
        mileage?: {
            val?: number;
            ts?: number;
        };
    };
};

export type ObdErrorsResponse = StarLineApiResponse & {
    obd_errors: Array<{
        error?: string;
        error_ts?: number;
        descriptions?: {
            ru?: string;
            en?: string;
        };
        warning_level?: number;
    }>;
};

type AsyncCommandStatus = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type AsyncCommandResponse = StarLineApiResponse & {
    cmd_id?: string;
    type?: string;
    value?: number;
    status: AsyncCommandStatus;
    device_id?: string;
    time_start?: number;
    time_stop?: number;
    now?: number;
};

export type DeviceSettingsResponse = StarLineApiResponse & {
    device_id: string;
    general?: {
        tel?: string;
        name?: string;
        imei?: string;
        fw_version?: string;
    };
    webasto?: Record<string, unknown>;
    monitoring?: Record<string, unknown>;
    shock_sens?: Record<string, unknown>;
    remote_start?: Record<string, unknown>;
};

type UserDeviceSummary = {
    activity?: string;
    device_id?: string;
    has_alarms?: "0" | "1";
    name?: string;
    online?: "0" | "1";
    type?: string;
    typename?: string;
};

export type UserDevicesResponse = StarLineApiResponse & {
    devices?: UserDeviceSummary[];
};

type DeviceListDevice = {
    alias?: string;
    device_id?: number;
    pos?: {
        x?: number;
        y?: number;
        ts?: number;
        sat_qty?: number;
        r?: number;
    };
    roles?: string[];
    status?: 1 | 2;
};

export type DeviceListResponse = StarLineApiResponse & {
    data?: {
        devices?: DeviceListDevice[];
    };
};

type MobileDevice = {
    app_version?: string;
    language?: string;
    os_type?: string;
    os_version?: string;
    model?: string;
    ser_num?: string;
    token?: string;
};

export type MobileDevicesResponse = StarLineApiResponse & {
    type?: "user_mobiles";
    mobiles?: MobileDevice[];
};

export type LbsStation = {
    mcc: number;
    mnc: number;
    lac: number;
    cid: number;
    pwr?: number;
};

export type LbsPositionRequest = {
    lbs_data: LbsStation[];
};

export type LbsPositionResponse = StarLineApiResponse & {
    gps?: {
        lat?: number;
        lon?: number;
        r?: number;
    };
};

export type DataTransferRequest = {
    address: string;
};

export type DataTransferResponse = StarLineApiResponse & {
    address?: string;
};

type EventDescription = {
    code?: number;
    group_id?: number;
    desc?: string;
};

export type LibraryEventsResponse = StarLineApiResponse & {
    eventDescriptions?: EventDescription[];
};

export type HijackVariables = {
    pin_code: string;
};
