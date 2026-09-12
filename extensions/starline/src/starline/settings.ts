import { API_VERSION, type ApiVersion } from "./constants";
import { StarLineUserApi } from "./user";
import { deviceUrl } from "./urls";

import type { DeviceSettingsResponse } from "../types/starline";

export class StarLineSettingsApi extends StarLineUserApi {
    putComfortOptions<T = unknown>(deviceId: string, body: unknown) {
        return this.postSettings<T>(deviceId, "put_comfort_options", body);
    }

    getSupportedComfortOptions<T = unknown>(deviceId: string) {
        return this.getSettingsEndpoint<T>(deviceId, "supported_comfort_options");
    }

    updateWebastoSettings<T = unknown>(deviceId: string, body: unknown) {
        return this.postSettings<T>(deviceId, "settings/webasto", body);
    }

    updateRemoteStartSettings<T = unknown>(deviceId: string, body: unknown) {
        return this.postSettings<T>(deviceId, "settings/remote_start", body, API_VERSION.v2);
    }

    updateShockSensorSettings<T = unknown>(deviceId: string, body: unknown) {
        return this.postSettings<T>(deviceId, "settings/shock_sens", body);
    }

    updateMonitoringSettings<T = unknown>(deviceId: string, body: unknown) {
        return this.postSettings<T>(deviceId, "settings/monitoring", body);
    }

    getSettings<T = DeviceSettingsResponse>(deviceId: string) {
        return this.getSettingsEndpoint<T>(deviceId, "settings", API_VERSION.v4);
    }

    private getSettingsEndpoint<T>(deviceId: string, path: string, version: ApiVersion = API_VERSION.v1) {
        return this.request<T>(deviceUrl(version, deviceId, path));
    }

    private postSettings<T>(deviceId: string, path: string, body: unknown, version: ApiVersion = API_VERSION.v1) {
        return this.request<T>(deviceUrl(version, deviceId, path), { method: "post", body });
    }
}
