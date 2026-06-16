import { showToast } from "@raycast/api";
import { act, create } from "react-test-renderer";

import DeviceCommand from "./devices";
import { StarLine } from "./starline/api";
import { CaptchaNeededError } from "./utils/errors";

import type { ReactTestRenderer } from "react-test-renderer";

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe("DeviceCommand", () => {
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        consoleErrorSpy = jest.spyOn(console, "error").mockImplementation((message?: unknown) => {
            if (
                typeof message === "string" &&
                message.includes("react-test-renderer is deprecated")
            ) {
                return;
            }
            process.stderr.write(`${String(message)}\n`);
        });
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
        jest.restoreAllMocks();
    });

    it("shows ordinary device loading errors in the failure toast", async () => {
        jest.spyOn(StarLine.prototype, "getDevices").mockRejectedValue(new Error("network down"));

        await act(async () => {
            create(<DeviceCommand />);
            await flushPromises();
        });

        expect(showToast).toHaveBeenCalledWith("failure", "Failed to load devices", "network down");
    });

    it("renders account-level actions in the Devices command", async () => {
        jest.spyOn(StarLine.prototype, "getDevices").mockResolvedValue({
            result: { devices: [], shared_devices: [], code: 200, codestring: "OK" },
        });
        let renderer: ReactTestRenderer | undefined;

        await act(async () => {
            renderer = create(<DeviceCommand />);
            await flushPromises();
        });

        if (renderer === undefined) {
            throw new Error("Renderer was not created");
        }

        const actionTitles = renderer.root
            .findAll((node) => typeof node.props.title === "string")
            .map((node) => String(node.props.title));

        expect(actionTitles).toEqual(
            expect.arrayContaining([
                "StarLine Account",
                "Show User Devices",
                "Show Device List",
                "Show Mobile Devices",
                "Manage Data Transfer",
            ]),
        );
    });

    it("shows captcha URL as description text instead of an editable field", async () => {
        jest.spyOn(StarLine.prototype, "getDevices").mockRejectedValue(
            new CaptchaNeededError("Captcha needed.", "sid-1", "https://captcha.test/image.png"),
        );
        let renderer: ReactTestRenderer | undefined;

        await act(async () => {
            renderer = create(<DeviceCommand />);
            await flushPromises();
        });

        if (renderer === undefined) {
            throw new Error("Renderer was not created");
        }

        const textFieldIds = renderer.root
            .findAll((node) => node.type === "Form.TextField")
            .map((node) => String(node.props.id));
        const descriptions = renderer.root.findAll((node) => node.type === "Form.Description");
        const descriptionText = descriptions.map((node) => String(node.props.text)).join("\n");

        expect(textFieldIds).toEqual(["captchaValue"]);
        expect(descriptionText).toContain("https://captcha.test/image.png");
    });
});
