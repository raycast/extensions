import { open } from "@raycast/api";

// TODO Open to users preferred/default browser
const Command = async () => {
  await open("https://typefully.com/", "com.apple.safari");
};

export default Command;
