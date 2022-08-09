import {List} from "@raycast/api";
import {useEffect, useState} from "react";
import {jxa} from "osascript-tag";

const search = () => {

  useEffect(() => {
    const dodo = async (query: string) => {
      const out = await jxa`
    const DT = Application("DEVONthink 3");
    
    const results = DT.search(${query});
    
    return results.map(result => ({
      uuid: result.uuid(),
      name: result.name(),
      score: result.score(),
      tags: result.tags(),
      path: result.path(),
      location: result.location(),
      type: result.type(),
    }));
    `;

      console.log(out);
    };

    dodo("hello");
  }, []);

  return <List>
    <List.Item title="hello world"/>
  </List>
};

// noinspection JSUnusedGlobalSymbols
export default search;
