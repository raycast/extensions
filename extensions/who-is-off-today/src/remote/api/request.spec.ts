import fetch from "node-fetch";
import { Request } from "./request";
import { It, Mock } from "moq.ts";
import { defaultPage } from "./models/page";

function makeMockFetch(expected: unknown) {
    const mockFetch = new Mock<typeof fetch>();
    return mockFetch
        .setup((_) => _(It.IsAny(), It.IsAny()))
        .returnsAsync({ status: 200, json: async () => expected } as never);
}

describe("Remote Request", () => {
    it("should return fetch data", async () => {
        const expected = { asd: {} };
        const mockFetch = makeMockFetch(expected);

        const request = new Request(mockFetch.object());

        expect(await request.send()).toEqual(expected);
    });

    it("should get given url", async () => {
        const mockFetch = makeMockFetch({});

        await Request.new(mockFetch.object()).get("test_url").send();

        mockFetch.verify((_) => _("test_url", It.IsAny()));
    });

    it("should use given parameters", async () => {
        const mockFetch = makeMockFetch({});
        const expectedParams = { someParam: "asd" };

        await Request.new(mockFetch.object()).get("test_url").params(expectedParams).send();

        mockFetch.verify((_) => _("test_url?someParam=asd", It.IsAny()));
    });

    it("should fetch all pages", async () => {
        const page1 = {
            data: {
                ...defaultPage({
                    current_page: 1,
                    total_pages: 2,
                }),
                whatever: [],
            },
        };
        const page2 = {
            data: {
                ...defaultPage({
                    current_page: 2,
                    total_pages: 2,
                }),
                whatever: [],
            },
        };
        const mockFetch = new Mock<typeof fetch>();
        mockFetch
            .setup((_) =>
                _(
                    It.Is((url: string) => url.includes("page=1")),
                    It.IsAny(),
                ),
            )
            .returnsAsync({ status: 200, json: async () => page1 } as never);
        mockFetch
            .setup((_) =>
                _(
                    It.Is((url: string) => url.includes("page=2")),
                    It.IsAny(),
                ),
            )
            .returnsAsync({ status: 200, json: async () => page2 } as never);

        const actual = await Request.new(mockFetch.object()).get("test_url").params({ page: "1" }).allPages();

        expect(actual).toEqual([page1.data, page2.data]);
    });
});
