import { It, Mock } from "moq.ts";
import { Remote } from "./remote";
import { RemoteApi } from "./api/api";
import fetch from "node-fetch";
import { defaultEmploymentsPayload } from "./api/models/employment";
import { defaultTimeOffsPayload } from "./api/models/timeoff";

describe("Remote", () => {
    let mockFetch: Mock<typeof fetch>;
    let remote: Remote;

    beforeEach(() => {
        mockFetch = new Mock<typeof fetch>();
        remote = new Remote(new RemoteApi("", false, mockFetch.object()));
    });

    it("should return off employees", async () => {
        const employments = defaultEmploymentsPayload([{ id: "1", full_name: "Foo Bar" }]);
        const timeoffs = defaultTimeOffsPayload([
            { employment_id: "1", timeoff_days: [{ day: "2024-01-23", hours: 4 }], end_date: "2024-01-23" },
        ]);

        mockFetch
            .setup((_) =>
                _(
                    It.Is((url: string) => url.includes("employ")),
                    It.IsAny(),
                ),
            )
            .returnsAsync({ status: 200, json: async () => employments } as never);

        mockFetch
            .setup((_) =>
                _(
                    It.Is((url: string) => url.includes("timeoff")),
                    It.IsAny(),
                ),
            )
            .returnsAsync({ status: 200, json: async () => timeoffs } as never);

        const offs = await remote.offEmployees(new Date("2024-01-23"));

        expect(offs).toEqual([
            {
                name: "Foo Bar",
                offUntil: new Date("2024-01-23"),
                offHours: 4,
            },
        ]);
    });
});
