import { environment, getPreferenceValues, List, Icon } from "@raycast/api";
import { useState } from "react";
import { FinalStep } from "./step";
import { Step } from "./step";
import { copyFileSync, existsSync } from "fs";
import { Factory } from "./factory";

export default function Command() {
  const [data, setData] = useState<JSX.Element[]>([]);
  const [loading, setLoading] = useState(false);

  const prefs = getPreferenceValues<Preferences>();

  const browserPaths = {
    chrome: "/Applications/Google Chrome.app",
    firefox: "/Applications/Firefox.app",
    safari: "/Applications/Safari.app",
    edge: "/Applications/Microsoft Edge.app",
    brave: "/Applications/Brave Browser.app",
    vivaldi: "/Applications/Vivaldi.app",
    opera: "/Applications/Opera.app",
    arc: "/Applications/Arc.app",
    orion: "/Applications/Orion.app",
    zen: "/Applications/Zen Browser.app",
  };

  function isBrowserInstalled(browser: keyof typeof browserPaths) {
    const path = browserPaths[browser];
    return path ? existsSync(path) : false;
  }

  if (!isBrowserInstalled(prefs.browser)) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title={`${prefs.browser} browser is not installed`}
          description="Please set the browser preference to one you have installed."
        />
      </List>
    );
  }

  const factory = Factory.create(prefs.browser, prefs.profile);

  const builder = factory.getQueryBuilder();

  const src = factory.getSrc();
  const limit = 3;
  const dir = environment.supportPath + "/data";

  function onChange(newText: string) {
    setLoading(true);
    copyFileSync(src, dir);

    const flow = new Step(
      dir,
      builder.queryRecents(limit, newText),
      factory.getRecentsAdapter(),
      new FinalStep(dir, builder.queryTopVisited(limit, newText), factory.getTopVisitedAdapter()),
    );

    async function run() {
      const payload = await flow.process();
      setData(payload.render());
      setLoading(false);
    }

    run();
  }

  return (
    <List
      isLoading={loading}
      navigationTitle="Find Website"
      searchBarPlaceholder="Quickly find the website you're looking for..."
      filtering={false}
      onSearchTextChange={onChange}
      throttle={true}
    >
      {data}
    </List>
  );
}
