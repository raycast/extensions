import { tvScheduleRepository } from "../../../../src/modules/tv/repositories/tvScheduleRepository";

describe("tv schedule repository", () => {
    it("returns tv schedule", async () => {
        const channels = await tvScheduleRepository.getAll();
        const programs = channels[0].schedule;

        expect(channels.length).toBeGreaterThan(1);

        expect(channels[0].name).toEqual("LA 1");
        expect(channels[0].icon).toEqual("https://www.movistarplus.es/recorte/m-NEO/canal/TVE.png");

        expect(programs[0]).toHaveProperty("startTime");
        expect(programs[0]).toHaveProperty("description");
    });
});