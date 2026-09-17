import { Action, ActionPanel, Color, getPreferenceValues, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { isOxvgAvailable } from "./oxvg";
import { optimizeSvgWithSvgo } from "./optimizer";
import { configHelper, SVGOPlugin } from "./utils-2";

export default function SVGOConfig() {
  const { provider } = getPreferenceValues<Preferences>();
  const [config, setConfig] = useState<SVGOPlugin[]>([]);
  const [forceUpdate, setForceUpdate] = useState(false);
  const triggerUpdate = () => setForceUpdate((cur) => !cur);

  const updateConfig = (index: number) => {
    const newVal = [...config];
    newVal[index].enabledByDefault = !newVal[index].enabledByDefault;
    configHelper.saveConfig(newVal);
    triggerUpdate();
  };
  const restoreConfig = async () => {
    configHelper.restore();
    triggerUpdate();
  };

  useEffect(() => {
    const init = async () => {
      const config = configHelper.getAllConfig();
      setConfig(config);
    };
    init();
  }, [forceUpdate]);

  const isOxvg = provider === "oxvg";
  const oxvgAvailable = isOxvg ? isOxvgAvailable() : true;

  return (
    <List
      navigationTitle="Update SVGO plugin config for all commands"
      searchBarPlaceholder="Search plugin"
      throttle={true}
      isShowingDetail
    >
      {isOxvg && (
        <List.Section title="OXVG Provider Active">
          <List.Item
            icon={{ source: Icon.Info, tintColor: oxvgAvailable ? Color.Blue : Color.Red }}
            title={
              oxvgAvailable
                ? "OXVG is active — SVGO plugin config is used as a best-effort hint"
                : "OXVG native binding not found — falling back to SVGO"
            }
            detail={
              <List.Item.Detail
                markdown={
                  oxvgAvailable
                    ? `## OXVG Provider\n\nYou are using **OXVG** as the optimization backend. OXVG is a Rust-based SVG optimizer that is significantly faster on large SVGs and batches.\n\nThe plugin settings below are converted to OXVG jobs where possible. Some SVGO plugins may not have an OXVG equivalent and will be silently ignored.\n\n[OXVG on GitHub](https://github.com/noahbald/oxvg)`
                    : `## OXVG Not Available\n\nThe OXVG native binding could not be loaded. The extension will use **SVGO** as a fallback.\n\nTo enable OXVG, run the following in the extension directory:\n\n\`\`\`\nnpm install --force @oxvg/napi-darwin-arm64\n\`\`\`\n\nOr the appropriate package for your platform:\n- macOS Apple Silicon: \`@oxvg/napi-darwin-arm64\`\n- macOS Intel: \`@oxvg/napi-darwin-x64\`\n- Linux x64: \`@oxvg/napi-linux-x64-gnu\`\n- Windows x64: \`@oxvg/napi-win32-x64-msvc\``
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open OXVG on GitHub" url="https://github.com/noahbald/oxvg" />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      <List.Section title={isOxvg ? "SVGO Plugin Config (used as OXVG hint)" : "SVGO Plugin Config"}>
        {config.map((item, index) => (
          <List.Item
            key={index}
            icon={item.enabledByDefault ? Icon.CheckCircle : Icon.Circle}
            title={item.name}
            detail={<ItemDetail enabled={item.enabledByDefault} id={item.id as string} />}
            actions={
              <ActionPanel>
                <Action title="Toggle (Auto Save)" onAction={() => updateConfig(index)} />
                <Action title="Restore Default Configs" onAction={restoreConfig} />
                <Action.OpenInBrowser title="Open SVGO Documentation" url="https://svgo.dev/docs/introduction/" />
                {isOxvg && (
                  <Action.OpenInBrowser title="Open OXVG Documentation" url="https://github.com/noahbald/oxvg" />
                )}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

type ItemDetailProps = {
  id: string;
  enabled: boolean;
};

const exampleSVG = `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg xmlns="http://www.w3.org/2000/svg" viewBox=" 0 0  150 100 " width="150"><!-- Created with love! --><defs><ellipse cx="50" cy="50.0" rx="50.00" ry="auto" fill="black" id="circle"/></defs><g><use href="#circle" transform="skewX(16)"/><rect id="useless" width="0" height="0" fill="#ff0000"/></g></svg>`;

function ItemDetail({ id, enabled }: ItemDetailProps) {
  const plugins = configHelper.getEnabledPlugins();
  const filteredPlugins = !enabled ? plugins.filter((item) => item !== id) : plugins;
  const optimizedSvg = optimizeSvgWithSvgo(exampleSVG, filteredPlugins);
  return (
    <List.Item.Detail
      markdown={`###### Original
\`${exampleSVG}\`
###### Optimized (SVGO preview)
\`${optimizedSvg}\`
`}
    />
  );
}
