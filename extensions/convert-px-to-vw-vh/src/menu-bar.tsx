import { Clipboard, MenuBarExtra, openCommandPreferences, showHUD } from "@raycast/api";
import { useHistory } from "./history";

export default function Command() {
  const { history, remove, clear } = useHistory();
  const icon = "icon.png";

  return (
    <MenuBarExtra icon={icon}>
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
                  await showHUD(`${valueHist.data.value} Copied value to clipboard`);
                } else {
                  remove(valueHist);
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
          <MenuBarExtra.Item title="🗑️ Clear History" onAction={clear} />
        </MenuBarExtra.Section>
      )}
    </MenuBarExtra>
  );
}
