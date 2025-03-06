import { author, name } from "../../package.json";

export default function createDeepLink(position: number) {
  const params = new URLSearchParams({
    arguments: JSON.stringify({ position: `${position}` }),
    launchType: "background",
  });

  return `raycast://extensions/${author}/${name}/openApplicationByPosition?${params}`;
}
