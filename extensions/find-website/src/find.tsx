import { environment, getPreferenceValues, List } from "@raycast/api";
import { useState } from "react";
import { FinalStep } from "./step";
import { Step } from "./step";
import { copyFileSync } from "fs";
import { Factory } from "./factory";

export default function Command() {
  const [data, setData] = useState<JSX.Element[]>([]);
  const [loading, setLoading] = useState(false);

  const prefs = getPreferenceValues<Preferences>();
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
