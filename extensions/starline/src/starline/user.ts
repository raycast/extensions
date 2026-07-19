import { StarLineDeviceApi } from "./devices";
import { API_VERSION, type ApiVersion } from "./constants";
import { appendQuery, userUrl } from "./urls";

import type {
    DataTransferRequest,
    DataTransferResponse,
    DeviceListResponse,
    LbsPositionRequest,
    LbsPositionResponse,
    LbsStation,
    MobileDevicesResponse,
    UserDevicesResponse,
} from "../types/starline";

export class StarLineUserApi extends StarLineDeviceApi {
    getUserDevices<T = UserDevicesResponse>() {
        return this.getUserEndpoint<T>(API_VERSION.v1, "devices");
    }

    getDeviceList<T = DeviceListResponse>() {
        return this.getUserEndpoint<T>(API_VERSION.v1, "deviceList");
    }

    getMobileDevices<T = MobileDevicesResponse>() {
        return this.getUserEndpoint<T>(API_VERSION.v1, "mobile_devices");
    }

    getLbsPosition<T = LbsPositionResponse>({ cid, lac, mcc, mnc }: LbsStation) {
        return this.getUserEndpoint<T>(API_VERSION.v1, "lbs_position", { mcc, mnc, lac, cid });
    }

    getLbsPositions<T = LbsPositionResponse>(body: LbsPositionRequest) {
        return this.postUserEndpoint<T>(API_VERSION.v1, "lbs_position", body);
    }

    getDataTransfer<T = DataTransferResponse>() {
        return this.getUserEndpoint<T>(API_VERSION.v1, "data_transfer");
    }

    updateDataTransfer<T = DataTransferResponse>(body: DataTransferRequest) {
        return this.postUserEndpoint<T>(API_VERSION.v1, "data_transfer", body);
    }

    async deleteDataTransfer<T = DataTransferResponse>() {
        const { userId } = await this.auth();
        return this.request<T>(userUrl(API_VERSION.v1, userId, "data_transfer"), {
            method: "delete",
        });
    }

    private async getUserEndpoint<T>(
        version: ApiVersion,
        path: string,
        query?: Record<string, string | number | boolean>,
    ) {
        const { userId } = await this.auth();
        const url = userUrl(version, userId, path);
        return this.request<T>(query === undefined ? url : appendQuery(url, query));
    }

    private async postUserEndpoint<T>(version: ApiVersion, path: string, body: unknown) {
        const { userId } = await this.auth();
        return this.request<T>(userUrl(version, userId, path), { method: "post", body });
    }
}
