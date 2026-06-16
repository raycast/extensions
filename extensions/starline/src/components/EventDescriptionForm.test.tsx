import { showToast } from "@raycast/api";
import React from "react";
import { act, create } from "react-test-renderer";

import EventDescriptionForm from "./EventDescriptionForm";
import { StarLineProvider } from "../context/starline";
import { StarLine } from "../starline/api";

import type { ReactTestRenderer } from "react-test-renderer";

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe("EventDescriptionForm", () => {
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

    function renderForm() {
        let renderer: ReactTestRenderer | undefined;
        act(() => {
            renderer = create(
                <StarLineProvider>
                    <EventDescriptionForm />
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

    it("shows failure toast and does not call getEventDescription when ID is empty", async () => {
        const getDescSpy = jest.spyOn(StarLine.prototype, "getEventDescription");
        const renderer = renderForm();

        const onSubmit = getOnSubmit(renderer);

        await act(async () => {
            await onSubmit();
            await flushPromises();
        });

        expect(getDescSpy).not.toHaveBeenCalled();
        expect(showToast).toHaveBeenCalledWith("failure", expect.any(String), expect.any(String));
    });

    it("shows failure toast when ID is not a positive integer", async () => {
        const getDescSpy = jest.spyOn(StarLine.prototype, "getEventDescription");
        const renderer = renderForm();

        const textField = renderer.root.findByType("Form.TextField");
        act(() => {
            (textField.props.onChange as (v: string) => void)("abc");
        });

        const onSubmit = getOnSubmit(renderer);

        await act(async () => {
            await onSubmit();
            await flushPromises();
        });

        expect(getDescSpy).not.toHaveBeenCalled();
        expect(showToast).toHaveBeenCalledWith("failure", expect.any(String), expect.any(String));
    });

    it("calls getEventDescription with parsed integer ID", async () => {
        const getDescSpy = jest.spyOn(StarLine.prototype, "getEventDescription").mockResolvedValue({
            code: 200,
            codestring: "OK",
            eventDescriptions: [{ code: 1, group_id: 2, desc: "Test event" }],
        });

        const renderer = renderForm();
        const textField = renderer.root.findByType("Form.TextField");

        act(() => {
            (textField.props.onChange as (v: string) => void)("42");
        });

        const onSubmit = getOnSubmit(renderer);

        await act(async () => {
            await onSubmit();
            await flushPromises();
        });

        expect(getDescSpy).toHaveBeenCalledWith(42);
    });
});
