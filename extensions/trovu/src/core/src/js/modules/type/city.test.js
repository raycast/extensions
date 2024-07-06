import CityType from "./city.js";

test("CityType.parse", async () => {
  expect(
    CityType.parse("75", {
      country: "fr",
      data: { types: { city: { fr: { 75: "Paris" } } } },
    }),
  ).toEqual("Paris");
});
