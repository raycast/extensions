import { Action, ActionPanel, Clipboard, Color, Icon, List } from "@raycast/api";
import { showFailureToast, useCachedState, usePromise } from "@raycast/utils";
import { useRef } from "react";
import { Faker, faker, Randomizer, SimpleFaker } from "@faker-js/faker";
import { RandomGenerator, xoroshiro128plus } from "pure-rand";
import { invoke, isObject } from "es-toolkit/compat";
import * as cheerio from "cheerio";

// const cache = new Cache();

interface Item {
  text: string;
  apiUrl: string;
  headers: HeaderItem[];
  headers2: string[];
}

interface HeaderItem {
  text: string;
  apiUrl: string;
  class: string;
  deprecated: boolean;
}

type TFaker = Faker & {
  [key: string]: any;
};

type TCustomSimpleFaker = SimpleFaker & {
  [key: string]: any;
};

type TRandomizer = Randomizer & {
  [key: string]: any;
  generator: RandomGenerator;
};

function generatePureRandRandomizer(
  seed: number | number[] = Date.now() ^ (Math.random() * 0x100000000),
  factory: (seed: number) => RandomGenerator = xoroshiro128plus,
): TRandomizer {
  const self = {
    next: () => (self.generator.unsafeNext() >>> 0) / 0x100000000,
    seed: (seed: number | number[]) => {
      self.generator = factory(typeof seed === "number" ? seed : seed[0]);
    },
  } as Randomizer & { generator: RandomGenerator };
  self.seed(seed);

  return self;
}

function checkParams(fn: () => NonNullable<unknown>) {
  if (fn?.length > 0) {
    return `Need params ${fn}`;
  }

  return false;
}

const randomSeed = Date.now() ^ (Math.random() * 0x100000000);
const dateRef = new Date("2020-01-01");

function runCommand(itemText: string, headerItemText: string = "") {
  const _itemText = itemText.toLowerCase();
  let result;

  const f: TFaker = faker;

  if (itemText === "Faker") {
    if (checkParams(f[headerItemText])) {
      result = "Need params";
    }

    if (headerItemText === "seed") {
      faker[headerItemText](randomSeed);
      result = `${itemText}.${headerItemText} seed done`;
    }

    if (headerItemText === "setDefaultRefDate") {
      faker[headerItemText](dateRef);
      result = `${itemText}.${headerItemText} done`;
    }

    result = f[headerItemText]();
  }

  if (itemText === "SimpleFaker") {
    const customSimpleFaker: TCustomSimpleFaker = new SimpleFaker();

    if (checkParams(customSimpleFaker[headerItemText])) {
      return;
    }

    if (headerItemText === "seed") {
      customSimpleFaker[headerItemText](randomSeed);
      result = `${itemText}.${headerItemText} seed done`;
    }

    if (headerItemText === "setDefaultRefDate") {
      customSimpleFaker[headerItemText](dateRef);
      result = `${itemText}.${headerItemText} done`;
    }

    result = customSimpleFaker[headerItemText]();
  }

  if (itemText === "Randomizer") {
    const randomizer: TRandomizer = generatePureRandRandomizer();

    if (headerItemText === "seed") {
      randomizer[headerItemText](42);
      return `${itemText}.${headerItemText} seed done`;
    }

    result = randomizer[headerItemText]();
  }

  if (itemText === "String") {
    if (headerItemText === "fromCharacters") {
      return faker.string[headerItemText]("mock string");
    }
  }

  if (itemText === "Helpers") {
    if (["weightedArrayElement", "shuffle", "arrayElements", "arrayElement"].includes(headerItemText)) {
      return f[_itemText][headerItemText]([
        { weight: 5, value: "sunny" },
        { weight: 4, value: "rainy" },
        { weight: 1, value: "snowy" },
      ]);
    }

    if (["objectKey", "objectValue", "objectEntry"].includes(headerItemText)) {
      return f[_itemText][headerItemText]({ myProperty: "myValue" });
    }

    if (["fake"].includes(headerItemText)) {
      return f[_itemText][headerItemText]("Hi, my name is {{person.firstName}} {{person.lastName}}!");
    }

    if (["maybe"].includes(headerItemText)) {
      return f[_itemText][headerItemText](() => "Hello World!", { probability: 0.9 });
    }
    if (["enumValue"].includes(headerItemText)) {
      enum Color {
        Red,
        Green,
        Blue,
      }

      return f[_itemText][headerItemText](Color);
    }
  }

  if (itemText === "Date") {
    if (["between", "betweens"].includes(headerItemText)) {
      return f[_itemText][headerItemText]({
        from: "2020-01-01T00:00:00.000Z",
        to: "2030-01-01T00:00:00.000Z",
        count: 2,
      });
    }
  }

  try {
    result = invoke(faker, `${_itemText}.${headerItemText}`);
  } catch (e) {
    const msg = e instanceof Error;
    result = `${headerItemText}: ${msg && e.message}`;
    showFailureToast(result);
  }

  if (!result) return "failed";

  return isObject(result) ? JSON.stringify(result) : result;
}

function openInBrowser(url: string) {
  try {
    console.log(`${url} was opened in default browser`);
  } catch (e) {
    console.log(e);
  }
}

async function getData(url: string) {
  // const cached = cache.get("html");
  //
  // if (!cached) {
  //   const $ = await cheerio.fromURL("https://fakerjs.dev/api/");
  //   cache.set("html", $.html());
  // }
  //
  // const $$ = cheerio.load(cached!);
  const $ = await cheerio.fromURL(url);

  const versionInfo = $.extract({
    version: ".VPFlyout:nth-last-child(1) button",
  });

  const modules = $.extract({
    list: [
      {
        selector: ".api-group",
        value: {
          text: "h3 a",
          apiUrl: {
            selector: "h3 a",
            value: "href",
          },
          headers: [
            {
              selector: "ul li a",
              value: (el) => {
                const classVal = $(el).attr("class");
                const apiUrl = $(el).attr("href");
                const text = $(el).text();

                return {
                  text,
                  apiUrl,
                  class: classVal,
                  deprecated: !!classVal,
                };
              },
            },
          ],
          headers2: ["ul li"],
        },
      },
    ],
  });

  // const hasDeprecatedData = modules.list.filter((listO) =>
  //   listO.headers2.some((header) => {
  //     return header.depreciated;
  //   }),
  // );

  return {
    version: versionInfo.version,
    list: modules.list,
  };
}

export default function Command() {
  const abortable = useRef<AbortController>();
  const [showDetails, setShowDetails] = useCachedState<Item[]>("show-details", []);
  const [version, setVersion] = useCachedState<string>("");
  const fakerBaseUrl = "https://fakerjs.dev";

  usePromise(
    async (url: string) => {
      const v = await getData(url);

      v && setShowDetails(v.list as Item[]);
      v && setVersion(v.version);
    },
    [fakerBaseUrl + "/api"],
    {
      abortable,
    },
  );

  return (
    <List navigationTitle={`${version}`}>
      {showDetails
        ?.filter((i) => !["Utilities"].includes(i.text))
        ?.map((item: Item, i: number) => (
          <List.Section title={item.text} key={`section-item-${i}`} subtitle={item.text}>
            {item.headers
              .filter((t: HeaderItem) => !["constructor"].includes(t.text))
              .map((headerItem: HeaderItem, index: number) => (
                <List.Item
                  key={`header-item-${index}`}
                  title={`${headerItem.text}`}
                  subtitle={`${item?.text?.toLowerCase()}.${headerItem?.text}`}
                  accessories={[
                    {
                      text: { value: headerItem.deprecated ? `Deprecated` : "", color: Color.Orange },
                      icon: headerItem.deprecated ? Icon.Warning : null,
                    },
                  ]}
                  actions={
                    <ActionPanel title={`Let's play it`}>
                      <ActionPanel.Submenu icon={Icon.EyeDropper} title="Actions">
                        <Action
                          icon={{ source: Icon.Play, tintColor: Color.Green }}
                          title="Run It"
                          onAction={async () => {
                            await Clipboard.paste(runCommand(item.text, headerItem.text));
                          }}
                        />
                        <Action.OpenInBrowser
                          url={fakerBaseUrl + headerItem.apiUrl}
                          icon={{ source: Icon.Link, tintColor: Color.Yellow }}
                          title={"View Api Doc in Browser"}
                          onOpen={openInBrowser}
                        />
                      </ActionPanel.Submenu>
                    </ActionPanel>
                  }
                ></List.Item>
              ))}
          </List.Section>
        ))}
    </List>
  );
}
