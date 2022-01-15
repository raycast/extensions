import fetch from "node-fetch";
import { assertNumberProp, assertStringProp, assertArrayProp } from "./typeUtils";
import he from "he";

export type QueryResultItem = {
  id: string;
  title: string;
  subtitle: string;
  url: string;
  accessoryTitle: string;
  icon: string;
  view_count: number;
  answer_count: number;
};

const parseResponse = (item: unknown) => {
  assertNumberProp(item, "question_id");
  assertStringProp(item, "title");
  assertNumberProp(item, "answer_count");
  assertNumberProp(item, "view_count");
  assertStringProp(item, "link");
  assertArrayProp(item, "tags");
  return {
    id: `${item.question_id}`,
    title: `${he.decode(item.title)}`,
    subtitle: `${he.decode(item.tags.join(" "))}`,
    url: `${item.link}`,
    accessoryTitle: `${item.answer_count} Answers`,
    icon: "so.png",
    view_count: parseInt(`${item.view_count}`, 0),
    answer_count: parseInt(`${item.answer_count}`, 0),
  };
};

const parseQuery = (q: string) => {
  const queryItems = q.split(" ");
  const qs = queryItems.filter((c) => !c.startsWith("."));
  const ts = queryItems.filter((c) => c.startsWith("."));

  let qss = "";
  if (qs.length) {
    qss = qs.join(" ");
  }

  let tss = "";
  if (ts.length) {
    tss = ts.map((x) => encodeURIComponent(x.substring(1))).join(";");
  }

  return { qss, tss };
};

export const searchResources = async (q: string): Promise<QueryResultItem[]> => {
  const requestOptions = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Accept-Encoding": "gzip, deflate, br",
    },
  };
  const { qss, tss } = parseQuery(q);
  const query = `https://api.stackexchange.com/2.3/search/advanced?key=U4DMV*8nvpm3EOpvf69Rxw((&site=stackoverflow&page=1&pagesize=20&order=desc&sort=relevance&q=${encodeURIComponent(
    qss
  )}&tagged=${tss}&filter=default`;
  const response = await fetch(query, requestOptions);
  if (response.status !== 200) {
    const data = (await response.json()) as { message?: unknown } | undefined;
    throw new Error(`${data?.message || "Not OK"}`);
  }
  const data = await response.json();
  assertArrayProp(data, "items");
  return data.items.map(parseResponse).sort(function (a, b) {
    return b.answer_count - a.answer_count || b.view_count - a.view_count;
  });
};
