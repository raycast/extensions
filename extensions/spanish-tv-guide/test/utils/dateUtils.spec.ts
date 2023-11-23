import { getTime, parseTime } from "../../src/utils/dateUtils";

process.env.TZ = "UTC";

describe("date utils", () => {
    beforeEach(() => jest.useFakeTimers().setSystemTime(new Date("2023-01-01")));

    it("returns date's hours and minutes", () => {
        expect(getTime(new Date("2023-01-29T16:40:45.280Z"))).toEqual("17:40");
        expect(getTime(new Date("2023-01-29T08:22:12.943Z"))).toEqual("09:22");
    });

    it("parses a date in string format using Europe/Madrid time zone", () => {
        expect(parseTime("16:40:45.280Z")).toEqual(new Date("2023-01-01T16:40:45.280Z"));
        expect(parseTime("08:22:12.943Z")).toEqual(new Date("2023-01-01T08:22:12.943Z"));
    });
});