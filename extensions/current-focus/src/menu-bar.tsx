import { Cache, MenuBarExtra } from "@raycast/api";

const cache = new Cache();

export default function Command() {
  const focus = cache.get("current-focus");

  return (
    <MenuBarExtra title={focus}>
      <MenuBarExtra.Item title="Seen" />
      <MenuBarExtra.Item
        title="Example Seen Pull Request"
        onAction={() => {
          console.log("seen pull request clicked");
        }}
      />
      <MenuBarExtra.Item title="Unseen" />
      <MenuBarExtra.Item
        title="Example Unseen Pull Request"
        onAction={() => {
          console.log("unseen pull request clicked");
        }}
      />
    </MenuBarExtra>
  );
}
