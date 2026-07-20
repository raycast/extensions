import { LocalStorage } from "@raycast/api";

import { StarLineCommands } from "./commands";
import { API_VERSION, type ApiVersion, LOCAL_STORAGE } from "./constants";
import { deviceUrl, legacyDeviceUrl, libraryUrl, userUrl } from "./urls";

import type { Devices, Item } from "../types/devices";
import type {
    ControlsLibraryResponse,
    DeviceEventsResponse,
    DevicePositionResponse,
    DeviceStateResponse,
    LibraryEventsResponse,
    ObdErrorsResponse,
    ObdParamsResponse,
} from "../types/starline";

export class StarLineDeviceApi extends StarLineCommands {
    async getDevices(): Promise<{ result: Devices }> {
        const { userId } = await this.auth();
        const data = await this.request<Devices>(userUrl(API_VERSION.v2, userId, "user_info"));
        const defaultDeviceId = Number(await LocalStorage.getItem(LOCAL_STORAGE.DEFAULT_DEVICE));
        const uniqueDevices = new Map<number, Item>();

        for (const device of [...data.devices, ...(data.shared_devices ?? [])]) {
            uniqueDevices.set(device.device_id, {
                ...device,
                default: device.device_id === defaultDeviceId,
            });
        }

        return { result: { ...data, devices: [...uniqueDevices.values()], shared_devices: [] } };
    }

    getControlsLibrary<T = ControlsLibraryResponse>(deviceId: string) {
        return this.request<T>(legacyDeviceUrl(deviceId, "ctrls_library"));
    }

    getDeviceInfo<T = unknown>(deviceId: string) {
        return this.getDevice<T>(API_VERSION.v1, deviceId, "info");
    }

    updateDeviceInfo<T = unknown>(deviceId: string, body: unknown) {
        return this.postDevice<T>(API_VERSION.v1, deviceId, "info", body);
    }

    getWays<T = unknown>(deviceId: string, body: unknown) {
        return this.postDevice<T>(API_VERSION.v1, deviceId, "ways", body);
    }

    updateControls<T = unknown>(deviceId: string, body: unknown) {
        return this.postDevice<T>(API_VERSION.v2, deviceId, "controls", body);
    }

    getObdParams<T = ObdParamsResponse>(deviceId: string) {
        return this.request<T>(legacyDeviceUrl(deviceId, "obd_params"));
    }

    getPosition<T = DevicePositionResponse>(deviceId: string) {
        return this.getDevice<T>(API_VERSION.v1, deviceId, "position");
    }

    getState<T = DeviceStateResponse>(deviceId: string) {
        return this.getDevice<T>(API_VERSION.v2, deviceId, "state");
    }

    getEvents<T = DeviceEventsResponse>(deviceId: string, body: unknown) {
        return this.postDevice<T>(API_VERSION.v2, deviceId, "events", body);
    }

    getObdErrors<T = ObdErrorsResponse>(deviceId: string) {
        return this.request<T>(legacyDeviceUrl(deviceId, "obd_errors"));
    }

    getDeviceData<T = unknown>(deviceId: string) {
        return this.getDevice<T>(API_VERSION.v3, deviceId, "data");
    }

    getDeviceReport<T = unknown>(deviceId: string) {
        return this.getDevice<T>(API_VERSION.v2, deviceId);
    }

    getDrivingScore<T = unknown>(deviceId: string, body: unknown) {
        return this.postDevice<T>(API_VERSION.v2, deviceId, "driving_score", body);
    }

    getDrivingScoreHistory<T = unknown>(deviceId: string, body: unknown) {
        return this.postDevice<T>(API_VERSION.v2, deviceId, "driving_score_history", body);
    }

    getObdData<T = unknown>(deviceId: string, body: unknown) {
        return this.postDevice<T>(API_VERSION.v1, deviceId, "getObdData", body);
    }

    getDetails<T = unknown>(deviceId: string, body: unknown) {
        return this.postDevice<T>(API_VERSION.v1, deviceId, "details", body);
    }

    getEventLibrary<T = LibraryEventsResponse>() {
        return this.request<T>(libraryUrl(API_VERSION.v3, "events"));
    }

    getEventDescription<T = LibraryEventsResponse>(eventId: number) {
        return this.request<T>(libraryUrl(API_VERSION.v3, `events/${eventId}`));
    }

    private getDevice<T>(version: ApiVersion, deviceId: string, path?: string) {
        return this.request<T>(deviceUrl(version, deviceId, path));
    }

    private postDevice<T>(version: ApiVersion, deviceId: string, path: string, body: unknown) {
        return this.request<T>(deviceUrl(version, deviceId, path), { method: "post", body });
    }
}
