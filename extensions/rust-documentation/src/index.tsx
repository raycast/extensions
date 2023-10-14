import { ActionPanel, List, Action } from "@raycast/api";
import got from "got";
import { useState, React, useEffect } from "react";
import { parse } from "node-html-parser";

const INPUT_DELAY_MS = 500;

interface State {
  crates: CrateDesc[];
  symbol?: string;
  curr_select?: string;
}

interface CrateDesc {
  name: string;
  version: string;
  desc: string;
  url?: string;
}

interface SymbolDesc {
  name: string;
  href: string;
  version: string;
}

export default function Command() {
  const [query, setQuery] = useState<string>("");
  const [state, setState] = useState<State>({ crates: [] });

  useEffect(() => {
    const timer = setTimeout(() => {
      doExecQuery();
    }, INPUT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [query]);

  async function doExecQuery() {
    const splited = query.split("#");
    const crate = splited[0];

    console.log("splited: ", splited);

    if (splited.length > 1) {
      const crate = splited[0];
      const symbol = splited[1];
      const symbolList: Array<SymbolDesc> = await buildSymbolList(crate);
      const results: Array<CrateDesc> = [];
      for (let i = 0; i < symbolList.length; i++) {
        const item = symbolList[i];
        if (item.name.toLowerCase().includes(symbol.toLowerCase())) {
          results.push({
            name: item.name,
            version: item.version,
            desc: item.href,
            url: item.href,
          });
        }
      }

      setState({
        crates: results,
        symbol: symbol,
        curr_select: state.curr_select,
      });
    } else {
      await searchCrate(crate);
    }
  }

  async function searchCrate(crate: string) {
    const data: any = await got
      .get(`https://crates.io/api/v1/crates?page=1&per_page=15&q=${crate}`, {
        parseJson: (text) => JSON.parse(text),
      })
      .json();

    const crates: Array<CrateDesc> = data["crates"].map(
      (crate: { [x: string]: any }) => {
        return {
          name: crate["name"],
          version: crate["newest_version"],
          desc: crate["description"],
        };
      }
    );
    const activeCrates = crates.filter(
      (crate: { [x: string]: any }) => crate.version !== "0.0.0"
    );

    setState({
      crates: activeCrates,
      symbol: state.symbol,
      curr_select: state.curr_select,
    });
  }

  async function requestResourceSuffix(crate: string) {
    // eslint-disable-line no-unused-vars
    const crateUnderscore = replaceUnderScore(crate);
    const body = (
      await got.get(`https://docs.rs/${crate}/latest/${crateUnderscore}`)
    ).body;
    const root = parse(body);
    const rustdocVars = root.getElementById("rustdoc-vars");
    const dataResourceSuffix = rustdocVars.getAttribute("data-resource-suffix");
    return dataResourceSuffix;
  }

  // don't know how to use this...
  // eslint-disable-line no-unused-vars
  async function buildSearchIndex(crate: string, suffix: string) {
    const crateUnderscore = replaceUnderScore(crate);
    const searchIndexRaw = (
      await got.get(
        `https://docs.rs/${crate}/latest/search-index${crateUnderscore}.js`
      )
    ).body;
    const bodyLine = searchIndexRaw.split("\n")[1];
    const searchIndex = JSON.parse(
      "{" + bodyLine.substring(0, bodyLine.length - 1) + "\n}"
    );
  }

  async function buildSymbolList(crate: string) {
    const crateUnderscore = replaceUnderScore(crate);
    const itemPrefix = `https://docs.rs/${crate}/latest/${crateUnderscore}/`;

    const body = (
      await got.get(
        `https://docs.rs/${crate}/latest/${crateUnderscore}/all.html`
      )
    ).body;
    const root = parse(body);
    const mainContent = root.getElementById("main-content");
    const list = mainContent.getElementsByTagName("a").map((item) => {
      return {
        name: item.firstChild.toString(),
        href: itemPrefix + item.getAttribute("href"),
        version:
          item.parentNode.parentNode.previousSibling.childNodes[0].toString(),
      };
    });
    return list;
  }

  // replace `-` with `_`
  function replaceUnderScore(str: string): string {
    return str.replace("-", "_");
  }

  function changeSelect(select: string | null) {
    if (select !== null) {
      state.curr_select = select;
      console.log("select: ", select);
      setState({
        crates: state.crates,
        symbol: state.symbol,
        curr_select: select,
      });
    }
  }

  function getUrl() {
    const crateName = state.curr_select;

    if (state.symbol != undefined && state.symbol.length > 0) {
      return state.crates.find((item) => item.name == crateName)?.url || "";
    } else {
      return `https://docs.rs/${crateName}`;
    }
  }

  return (
    <List
      onSearchTextChange={(query) => setQuery(query)}
      onSelectionChange={changeSelect}
    >
      {state.crates.map((crate) => (
        <List.Item
          key={crate.name}
          title={crate.name}
          id={crate.name}
          subtitle={crate.desc}
          accessories={[{ text: crate.version }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={getUrl()} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
