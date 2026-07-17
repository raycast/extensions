import { iconFormatsMap } from "./format-name";

describe("format icon name", () => {
  const cases = [
    { setId: "simple-icons", iconId: "raycast" },
    { setId: "lucide-lab", iconId: "apple-core" },
  ];

  const results = cases.map((item) =>
    Object.fromEntries(
      Object.entries(iconFormatsMap).map(([format, formatter]) => {
        return [format, formatter(item)];
      }),
    ),
  );

  it("should format icon names correctly", () => {
    expect(results).toMatchInlineSnapshot(`
     [
       {
         "<SetNameIconName />": "<SimpleIconsRaycast />",
         "<set-name-icon-name />": "<simple-icons-raycast />",
         "IconName": "Raycast",
         "SetNameIconName": "SimpleIconsRaycast",
         "i-set-name-icon-name": "i-simple-icons-raycast",
         "i-set-name:icon-name": "i-simple-icons:raycast",
         "icon-[set-name--icon-name]": "icon-[simple-icons--raycast]",
         "icon-name": "raycast",
         "set-name--icon-name": "simple-icons--raycast",
         "set-name-icon-name": "simple-icons-raycast",
         "set-name/icon-name": "simple-icons/raycast",
         "set-name:icon-name": "simple-icons:raycast",
         "setNameIconName": "simpleIconsRaycast",
       },
       {
         "<SetNameIconName />": "<LucideLabAppleCore />",
         "<set-name-icon-name />": "<lucide-lab-apple-core />",
         "IconName": "AppleCore",
         "SetNameIconName": "LucideLabAppleCore",
         "i-set-name-icon-name": "i-lucide-lab-apple-core",
         "i-set-name:icon-name": "i-lucide-lab:apple-core",
         "icon-[set-name--icon-name]": "icon-[lucide-lab--apple-core]",
         "icon-name": "apple-core",
         "set-name--icon-name": "lucide-lab--apple-core",
         "set-name-icon-name": "lucide-lab-apple-core",
         "set-name/icon-name": "lucide-lab/apple-core",
         "set-name:icon-name": "lucide-lab:apple-core",
         "setNameIconName": "lucideLabAppleCore",
       },
     ]
    `);
  });
});
