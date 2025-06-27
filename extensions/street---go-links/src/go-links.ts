import { open } from "@raycast/api";

export default async function main(args: { arguments: { link: string } }) {
  const { link } = args.arguments;
  if (!link) {
    throw new Error("You must provide a value for {link}.");
  }
  const url = `https://go.my.streetgroup.co.uk/r/${encodeURIComponent(link)}`;
  await open(url);
}
