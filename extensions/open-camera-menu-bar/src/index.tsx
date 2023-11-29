import { MenuBarExtra, open } from "@raycast/api";

export default function Command() {
  return (
    <MenuBarExtra
      icon={{
        source: {
          light: "icon-black.svg",
          dark: "icon-white.svg",
        },
      }}
    >
      <OpenCamera />
    </MenuBarExtra>
  );
}

function OpenCamera() {
  open("raycast://extensions/raycast/system/open-camera");
  return null;
}
