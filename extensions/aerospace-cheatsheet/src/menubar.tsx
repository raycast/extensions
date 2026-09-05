import { Icon, MenuBarExtra, open } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { aerospace } from "./lib/config";
import { focusWorkspace, listWorkspaces } from "./lib/workspaces";

/**
 * Menu bar view: which workspace you're on, where else has windows, and the handful
 * of layout actions worth reaching for without a keystroke.
 */
export default function Command() {
  const { data, isLoading, revalidate } = useCachedPromise(async () => listWorkspaces(), []);

  const focused = data?.find((w) => w.isFocused);
  const inUse = (data ?? []).filter((w) => !w.isEmpty);

  return (
    <MenuBarExtra icon={Icon.AppWindowGrid2x2} title={focused?.name ?? "–"} isLoading={isLoading}>
      <MenuBarExtra.Section title="Workspaces">
        {inUse.map((w) => (
          <MenuBarExtra.Item
            key={w.name}
            title={w.name}
            icon={w.isFocused ? Icon.CircleFilled : Icon.Circle}
            onAction={async () => {
              await focusWorkspace(w.name);
              revalidate();
            }}
          />
        ))}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Layout">
        <MenuBarExtra.Item
          title="Root axis → columns"
          onAction={() => aerospace("layout", "--root", "h_tiles").then(revalidate)}
        />
        <MenuBarExtra.Item
          title="Root axis → rows"
          onAction={() => aerospace("layout", "--root", "v_tiles").then(revalidate)}
        />
        <MenuBarExtra.Item title="Flatten tree" onAction={() => aerospace("flatten-workspace-tree").then(revalidate)} />
        <MenuBarExtra.Item title="Balance sizes" onAction={() => aerospace("balance-sizes").then(revalidate)} />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Cheatsheet"
          icon={Icon.Book}
          // Deep links are raycast://extensions/<author>/<extension>/<command>, so this
          // has to track the author handle in package.json.
          onAction={() => open("raycast://extensions/nmcv/aerospace-cheatsheet/cheatsheet")}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
