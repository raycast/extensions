import { Action, ActionPanel, List, Image } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import Parser from "rss-parser";

const parser = new Parser();

interface Article {
  title: string;
  link: string;
  pubDate: string;
  author: string;
  content: string;
  id: string;
}

export default function Command() {
  const [rssLink, setRssLink] = useState("https://rb.ru/feeds/all/");
  const { isLoading, data } = useFetch(rssLink, {
    async parseResponse(response) {
      if (!response.ok) {
        throw new Error(response.statusText);
      }

      const data = await response.text();
      if (data !== undefined) {
        const feed = await parser.parseString(data as string);

        return { items: feed.items as Article[] };
      }
      return { items: [] };
    },
  });

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select a category"
          defaultValue={"Беспилотные аппараты"}
          storeValue
          onChange={(newValue) => setRssLink(newValue as string)}
        >
          <List.Dropdown.Item title={"Беспилотные аппараты"} value={"https://rb.ru/feeds/tag/drone/"} />
          <List.Dropdown.Item title={"Биотехнологии"} value={"https://rb.ru/feeds/tag/biotech/"} />
          <List.Dropdown.Item title={"Биткоины"} value={"https://rb.ru/feeds/tag/bitcoin/"} />
          <List.Dropdown.Item title={"Большие данные"} value={"https://rb.ru/feeds/tag/bigdata/"} />
          <List.Dropdown.Item title={"Виртуальная реальность"} value={"https://rb.ru/feeds/tag/vr/"} />
          <List.Dropdown.Item title={"Интернет вещей"} value={"https://rb.ru/feeds/tag/iot/"} />
          <List.Dropdown.Item title={"Информационные технологии, IT"} value={"https://rb.ru/feeds/tag/it/"} />
          <List.Dropdown.Item title={"Искусственный интеллект"} value={"https://rb.ru/feeds/tag/ai/"} />
          <List.Dropdown.Item title={"Кибербезопасность"} value={"https://rb.ru/feeds/tag/cybersecurity/"} />
          <List.Dropdown.Item title={"Киберспорт"} value={"https://rb.ru/feeds/tag/cybersport/"} />
          <List.Dropdown.Item title={"Криптовалюты и ICO"} value={"https://rb.ru/feeds/tag/crypto/"} />
          <List.Dropdown.Item title={"Космос"} value={"https://rb.ru/feeds/tag/space"} />
          <List.Dropdown.Item title={"Логистика и доставка"} value={"https://rb.ru/feeds/tag/delivery/"} />
          <List.Dropdown.Item title={"Маркетинг"} value={"https://rb.ru/feeds/tag/marketing/"} />
          <List.Dropdown.Item title={"Носимые гаджеты"} value={"https://rb.ru/feeds/tag/wearable/"} />
          <List.Dropdown.Item title={"Облачные технологии"} value={"https://rb.ru/feeds/tag/cloud/"} />
          <List.Dropdown.Item title={"Пиар (PR)"} value={"https://rb.ru/feeds/tag/pr/"} />
          <List.Dropdown.Item title={"Работа с персоналом (HR)"} value={"https://rb.ru/feeds/tag/hr/"} />
          <List.Dropdown.Item title={"Реклама"} value={"https://rb.ru/feeds/tag/advertising/"} />
          <List.Dropdown.Item title={"Роботы"} value={"https://rb.ru/feeds/tag/robotics/"} />
          <List.Dropdown.Item title={"Технологии в медицине"} value={"https://rb.ru/feeds/tag/medtech/"} />
          <List.Dropdown.Item title={"Технологии в секс-индустрии"} value={"https://rb.ru/feeds/tag/sextech/"} />
          <List.Dropdown.Item title={"Финансовые технологии"} value={"https://rb.ru/feeds/tag/fintech/"} />
          <List.Dropdown.Item title={"Фуд-стартапы"} value={"https://rb.ru/feeds/tag/foodtech/"} />
          <List.Dropdown.Item title={"Хардвер"} value={"https://rb.ru/feeds/tag/hardware/"} />
          <List.Dropdown.Item
            title={"Экономика совместного потребления (sharing economy)"}
            value={"https://rb.ru/feeds/tag/sharing/"}
          />
          <List.Dropdown.Item title={"Электронная коммерция"} value={"https://rb.ru/feeds/tag/ecommerce/"} />
          <List.Dropdown.Item title={"SEO"} value={"https://rb.ru/feeds/tag/seo/"} />
          <List.Dropdown.Item title={"SMM"} value={"https://rb.ru/feeds/tag/smm/"} />
        </List.Dropdown>
      }
    >
      {data && data.items?.map((item, index) => <StoryListItem key={item.id} item={item} index={index} />)}
    </List>
  );
}

function StoryListItem(props: { item: Article; index: number }) {
  const icon = getIcon(props.index + 1);
  const date = new Date(props.item.pubDate);

  return (
    <List.Item
      icon={icon}
      title={
        `${props.item.title?.slice(0, 70)}${props.item.title && props.item.title.length > 70 ? "..." : ""}` ??
        "No title"
      }
      subtitle={props.item.author}
      accessories={[{ date: date, tooltip: date.toLocaleString() }]}
      actions={<Actions item={props.item} />}
    />
  );
}

function getIcon(index: number): Image.ImageLike {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
      <rect x="0" y="0" width="40" height="40" fill="#A14D5D" rx="10"></rect>
      <text
      font-size="22"
      fill="white"
      font-family="Verdana"
      text-anchor="middle"
      alignment-baseline="baseline"
      x="20.5"
      y="32.5">${index}</text>
    </svg>
  `.replaceAll("\n", "");

  return {
    source: `data:image/svg+xml,${svg}`,
  };
}

function Actions(props: { item: Parser.Item }) {
  return (
    <ActionPanel>
      {props.item.link && <Action.OpenInBrowser url={props.item.link} />}
      {props.item.link && <Action.CopyToClipboard content={props.item.link} title="Copy Link" />}
    </ActionPanel>
  );
}
