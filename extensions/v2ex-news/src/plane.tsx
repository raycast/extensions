import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { v2exCli } from "@/api";
import { Plane } from "@chyroc/v2ex-api";
import { cmdEnter } from "@/shortcut";
import { TopicListByName } from "@/components";

export default () => {
  const [loading, setLoading] = useState(false);
  const [planes, setPlanes] = useState<Plane[]>([]);

  useEffect(() => {
    const f = async () => {
      try {
        setLoading(true);
        const res = await v2exCli.getPlanes();
        setLoading(false);
        // console.log(res)
        setPlanes(res.planes);
      } catch (e) {
        setLoading(false);
        console.error(e);
        await showToast(Toast.Style.Failure, "request fail", `${e}`);
      }
    };
    f();
  }, []);

  return (
    <List throttle={true} isLoading={loading}>
      {planes.map((v) => {
        return (
          <List.Section title={`${v.title} | ${v.name}`} key={v.name}>
            {v.nodes.map((node) => {
              return (
                <List.Item
                  title={node.title}
                  key={node.name}
                  actions={
                    <ActionPanel>
                      <Action.Push
                        icon={cmdEnter.icon}
                        title={cmdEnter.title}
                        shortcut={cmdEnter.key}
                        target={<TopicListByName nodeTitle={node.title} nodeName={node.name} />}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
};
