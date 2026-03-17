import { List } from "@raycast/api";
import json2md from "json2md";
import groupBy from "lodash.groupby";
import { FlavorText } from "../types";
import { fixFlavorText } from "../utils";

export default function Descriptions(props: {
  name: string;
  entries: FlavorText[];
}) {
  return (
    <List
      throttle
      navigationTitle={`${props.name} | Descriptions`}
      isShowingDetail={Boolean(props.entries.length)}
    >
      {Object.entries(
        groupBy(
          props.entries,
          (e) => e.versiongroup.generation.generationnames[0].name,
        ),
      ).map(([generation, groups]) => {
        return (
          <List.Section title={generation} key={generation}>
            {groups.map((entry, idx) => {
              const title = entry.versiongroup.versions
                .map((v) => v.versionnames[0].name)
                .join(" & ");
              return (
                <List.Item
                  key={idx}
                  title={title}
                  detail={
                    <List.Item.Detail
                      markdown={json2md([
                        {
                          h1: title,
                        },
                        {
                          p: fixFlavorText(entry.flavor_text),
                        },
                      ])}
                    />
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
