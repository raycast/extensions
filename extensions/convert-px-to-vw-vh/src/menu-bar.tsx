import { Clipboard, environment, MenuBarExtra, openCommandPreferences, showHUD } from "@raycast/api";
import { useHistory } from "./history";

export default function Command() {
  const { history, remove, clear } = useHistory();

  return (
    <MenuBarExtra icon="../assets/logo.svg">
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Configure Command"
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={openCommandPreferences}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        {history.length > 0 ? (
          history.map((valueHist, index) => (
            <MenuBarExtra.Item
              key={index}
              title={valueHist.data.label}
              onAction={async (event) => {
                if (event.type === "left-click") {
                  await Clipboard.copy(valueHist.data.value);
                  await showHUD(`${valueHist.data.value} Copied color to clipboard`);
                } else {
                  remove(valueHist);
                  await showHUD("Deleted color from history");
                }
              }}
            />
          ))
        ) : (
          <MenuBarExtra.Item title="No history" />
        )}
      </MenuBarExtra.Section>
      {history.length > 0 && (
        <MenuBarExtra.Section>
          {environment.isDevelopment && <MenuBarExtra.Item title="🗑️ Clear History" onAction={clear} />}
        </MenuBarExtra.Section>
      )}
    </MenuBarExtra>
  );
}
