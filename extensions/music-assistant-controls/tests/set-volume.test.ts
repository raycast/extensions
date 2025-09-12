describe("set-volume command", () => {
  describe("volume validation", () => {
    it("should accept valid volume values", () => {
      const validVolumes = [0, 50, 100];
      validVolumes.forEach((volume) => {
        const n = Number(volume);
        const isValid = !isNaN(n) && n >= 0 && n <= 100;
        expect(isValid).toBe(true);
      });
    });

    it("should reject invalid volume values", () => {
      const invalidVolumes = [-1, 101, "abc", NaN];
      invalidVolumes.forEach((volume) => {
        const n = Number(volume);
        const isValid = !isNaN(n) && n >= 0 && n <= 100;
        expect(isValid).toBe(false);
      });
    });
  });
});
