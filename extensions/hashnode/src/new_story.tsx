import open from "open";

export default async function NewStory() {
  await open(`https://hashnode.com/create/story?title=${encodeURIComponent("Created from Raycast ⚡️")}`);
}
