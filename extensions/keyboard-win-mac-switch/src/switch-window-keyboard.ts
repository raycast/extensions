import { exec } from "child_process";
import { showHUD } from "@raycast/api";
export default function command() {
  exec(
    `hidutil property --set '{"UserKeyMapping":[
  {
    "HIDKeyboardModifierMappingSrc": 0x7000000E3,
    "HIDKeyboardModifierMappingDst": 0x7000000E2
  },
  {
    "HIDKeyboardModifierMappingSrc": 0x7000000E2,
    "HIDKeyboardModifierMappingDst": 0x7000000E3
  }
]}'`,
    (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`Error: ${stderr}`);
        return;
      }
      console.log(`Output: ${stdout}`);
    },
  );
  showHUD(`✅ Window keyboard`);
}
