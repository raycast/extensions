import { confirmAlert, showToast } from "@raycast/api";
import React from "react";
import { act, create } from "react-test-renderer";

import HijackCommandForm from "./HijackCommandForm";
import { StarLineProvider } from "../context/starline";
import { StarLine } from "../starline/api";

import type { ReactTestRenderer } from "react-test-renderer";
import type { Item } from "../types/devices";

const item = {
    device_id: 42,
    alias: "Car",
    phone: "",
    car_state: {},
    functions: [],
    controls: [],
} as Item;

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe("HijackCommandForm", () => {
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

    function renderForm(enabled: boolean) {
        let renderer: ReactTestRenderer | undefined;
        act(() => {
            renderer = create(
                <StarLineProvider>
                    <HijackCommandForm item={item} enabled={enabled} />
                </StarLineProvider>,
            );
        });
        if (renderer === undefined) {
            throw new Error("Renderer was not created");
        }
        return renderer;
    }

    function getOnSubmit(renderer: ReactTestRenderer) {
        const form = renderer.root.findByType("Form");
        const actionsEl = form.props.actions as React.ReactElement;
        return (actionsEl.props.children as React.ReactElement<{ onSubmit: () => Promise<void> }>)
            .props.onSubmit;
    }

    it("shows failure toast and does not call setHijackMode when PIN is empty", async () => {
        const setHijackSpy = jest.spyOn(StarLine.prototype, "setHijackMode");
        const renderer = renderForm(true);

        const onSubmit = getOnSubmit(renderer);

        await act(async () => {
            await onSubmit();
            await flushPromises();
        });

        expect(setHijackSpy).not.toHaveBeenCalled();
        expect(showToast).toHaveBeenCalledWith("failure", expect.any(String), expect.any(String));
    });

    it("does not call setHijackMode when user cancels confirmation", async () => {
        const setHijackSpy = jest.spyOn(StarLine.prototype, "setHijackMode");
        (confirmAlert as jest.Mock).mockResolvedValueOnce(false);

        const renderer = renderForm(true);
        const pinField = renderer.root.findByType("Form.PasswordField");

        act(() => {
            (pinField.props.onChange as (v: string) => void)("1234");
        });

        const onSubmit = getOnSubmit(renderer);

        await act(async () => {
            await onSubmit();
            await flushPromises();
        });

        expect(setHijackSpy).not.toHaveBeenCalled();
    });

    it("calls setHijackMode when PIN is provided and confirmed", async () => {
        const mockToast = { style: "", title: "", message: "" };
        (showToast as jest.Mock).mockResolvedValue(mockToast);

        const setHijackSpy = jest
            .spyOn(StarLine.prototype, "setHijackMode")
            .mockResolvedValue({ code: 200, codestring: "OK", status: 2 });
        (confirmAlert as jest.Mock).mockResolvedValueOnce(true);

        const renderer = renderForm(true);
        const pinField = renderer.root.findByType("Form.PasswordField");

        act(() => {
            (pinField.props.onChange as (v: string) => void)("1234");
        });

        const onSubmit = getOnSubmit(renderer);

        await act(async () => {
            await onSubmit();
            await flushPromises();
        });

        expect(setHijackSpy).toHaveBeenCalledWith("42", true, "1234");
    });
});
