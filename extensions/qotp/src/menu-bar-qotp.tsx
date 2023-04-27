import { MenuBarExtra } from "@raycast/api";
import { ExtraList } from "./data";

// package.json command
// {
//   "name": "menu-bar-qotp",
//   "title": "QOTP",
//   "description": "QOTP is a simple tool to generate OTP code",
//   "mode": "menu-bar",
//   "interval": "1s"
// }

export default function Command() {
  return (
    <MenuBarExtra icon="otp.png" tooltip="Click to view OTP">
      {ExtraList.map((item, index) => (
        <MenuBarExtra.Item
          key={index}
          title={item.title}
          subtitle={item.subtitle || ""}
          onAction={() => {
            console.log("item clicked");
          }}
        />
      ))}
    </MenuBarExtra>
  );
}
