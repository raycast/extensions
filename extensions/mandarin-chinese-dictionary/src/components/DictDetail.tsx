import { FC } from "react";

import { List } from "@raycast/api";

import { Dict } from "../logic/types";

function splitDef(test: string) {
  const [explain, example] = test.split("[例]");

  return example ? `${explain}\n\n------\n\n[例]${example}` : `${explain}\n\n`;
}

export const DictDetail: FC<Dict> = ({ heteronyms }) => {
  const markdown = heteronyms[0].definitions.map((d) => `### ${splitDef(d.def)}`).join("\n\n");

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="bopomofo" text={heteronyms[0].bopomofo} />
          <List.Item.Detail.Metadata.Label title="pinyin" text={heteronyms[0].pinyin} />
        </List.Item.Detail.Metadata>
      }
    />
  );
};
