import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { optimize } from "svgo";
import { configHelper, SVGOPlugin } from "./utils-2";

export default function SVGOConfig() {
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

  return (
    <List
      navigationTitle="Update SVGO config for all commands"
      searchBarPlaceholder="Search plugin"
      throttle={true}
      isShowingDetail
    >
      {config.map((item, index) => (
        <List.Item
          key={index}
          icon={item.enabledByDefault ? Icon.CheckCircle : Icon.Circle}
          title={item.name}
          detail={<ItemDetail enabled={item.enabledByDefault} id={item.id as string} />}
          actions={
            <ActionPanel>
              <Action title="Toggle (auto save)" onAction={() => updateConfig(index)} />
              <Action title="Restore default configs" onAction={restoreConfig} />
              <Action.OpenInBrowser title="Open documentation" url="https://svgo.dev/docs/introduction/" />
            </ActionPanel>
          }
        />
      ))}
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
  const optimizedSvg = optimize(exampleSVG, { plugins: filteredPlugins }).data;
  return (
    <List.Item.Detail
      markdown={`###### Original
\`${exampleSVG}\`
###### Optimized
\`${optimizedSvg}\`
`}
    />
  );
}
