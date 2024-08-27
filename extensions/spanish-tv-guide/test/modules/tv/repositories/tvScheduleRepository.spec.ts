import { tvScheduleRepository } from "../../../../src/modules/tv/repositories/tvScheduleRepository";

describe("tv schedule repository", () => {
    it("returns tv schedule", async () => {
        const channels = await tvScheduleRepository.getAll();
        const programs = channels[0].schedule;

        expect(channels.length).toBeGreaterThan(1);

        expect(channels[0].name).toEqual("LA 1");
        expect(channels[0].icon).toEqual("https://www.movistarplus.es/recorte/m-NEO/canal/TVE.png");

        expect(programs[0]).toHaveProperty("startTime");
        expect(programs[0]).toHaveProperty("title");
        expect(programs.filter(program => program.isCurrentlyLive)).toHaveLength(1);
    });

    it("returns program details", async () => {
        const channels = await tvScheduleRepository.getAll();
        const program = channels[0].schedule[0];

        const programDetails = await tvScheduleRepository.getProgramDetails(program);

        expect(programDetails).toHaveProperty("title");
        expect(programDetails).toHaveProperty("startTime");
        expect(programDetails).toHaveProperty("image");
        expect(programDetails).toHaveProperty("description");
    });
});