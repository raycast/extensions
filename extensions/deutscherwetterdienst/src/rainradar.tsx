import { Detail } from "@raycast/api";

export default function RainRadar() {
  const markdown = `
# Rain radar
![Rain radar](https://www.dwd.de/DWD/wetter/radar/radfilm_brd_akt.gif?cache=${Math.floor(Date.now() / 900000)})`;

  return <Detail markdown={markdown} />;
}
