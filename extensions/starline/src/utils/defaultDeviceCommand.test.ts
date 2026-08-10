import { LocalStorage, confirmAlert, showToast } from "@raycast/api";

import { StarLine } from "../starline/api";
import { LOCAL_STORAGE } from "../starline/constants";

import defaultDeviceCommand from "./defaultDeviceCommand";

describe("defaultDeviceCommand", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(showToast).mockResolvedValue({} as never);
    });

    it("asks for confirmation before running a destructive no-view command", async () => {
        jest.mocked(LocalStorage.getItem).mockImplementation((key) =>
            Promise.resolve(key === LOCAL_STORAGE.DEFAULT_DEVICE ? "42" : undefined),
        );
        jest.mocked(confirmAlert).mockResolvedValue(false);
        const disarmSpy = jest.spyOn(StarLine.prototype, "disarm").mockResolvedValue({ arm: "0" });

        await defaultDeviceCommand("disarm");

        const [alertOptions] = jest.mocked(confirmAlert).mock.calls[0] as unknown as [
            { title: string; primaryAction: { title: string } },
        ];

        expect(alertOptions.title).toBe("Disarm vehicle?");
        expect(alertOptions.primaryAction.title).toBe("Disarm");
        expect(disarmSpy).not.toHaveBeenCalled();
    });
});
