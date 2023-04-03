import { Icon, Color, Detail, List, showToast, Toast, Action, ActionPanel, preferences } from "@raycast/api";
import cheerio from "cheerio";
import { useEffect, useState } from "react";
import { useFetch } from "@raycast/utils";
import nodeFetch from "node-fetch";

type Result = {
  name: string;
  category: string;
  link: string;
  seeders: string;
  leechers: string;
  description: string;
  uploader: string;
  uploadDate: string;
  size: string;
  source: string;
  commentsCount: string;
  comments: boolean;
  vip: boolean;
  trusted: boolean;
  magnet: string;
};

interface Pages {
  value: string;
  title: string;
}

async function searchPages(q = "", { fetch = nodeFetch, baseURL = "", sortby = "7" } = {}) {
  if (!fetch) {
    throw new Error("piratebay-search: No fetch implementation provided");
  }

  if (!q || typeof q !== "string" || q.length === 0) {
    throw new Error("piratebay-search: Please provide valid search query");
  }

  const url = `${baseURL}/search/${encodeURIComponent(q)}/0/${sortby}/0`;
  const res = await fetch(url);
  const text = await res.text();

  const $ = cheerio.load(text);

  const pageNumbers = $("table[id='searchResult'] tr")
    .last()
    .text()
    .split("\n")
    .join("")
    .split(" ")
    .filter((item) => item); // empty Array entries are removed

  const pages: Pages[] = [];

  pageNumbers.forEach((element: string) => {
    if (/^-?\d+$/.test(element)) {
      // check if last element on page are numbers
      const pageEntry = {
        value: element,
        title: "Page " + element,
      };
      pages.push(pageEntry);
    } else if (pages.length === 0) {
      pages.push({
        value: "1",
        title: "Page 1",
      });
    }
  });
  return pages;
}

async function search(q = "", { fetch = nodeFetch, baseURL = "", page = 0, category = 0, sortby = "7" } = {}) {
  if (!fetch) {
    throw new Error("piratebay-search: No fetch implementation provided");
  }

  if (!q || typeof q !== "string" || q.length === 0) {
    throw new Error("piratebay-search: Please provide valid search query");
  }

  if (page === undefined || !Number.isInteger(page)) {
    throw new Error(`piratebay-search: Invalid page of ${page} provided`);
  }

  const url = `${baseURL}/search/${encodeURIComponent(q)}/${page}/${sortby}/${category}`;
  const res = await fetch(url);
  const text = await res.text();

  const $ = cheerio.load(text);

  const torrents: Result[] = [];

  $("table[id='searchResult'] tr").each(function (this: cheerio.Element) {
    const icons: string[] = [];
    const hasComments = $(this)
      .find("td")
      .find("img")
      .each(function (i: number, link: cheerio.Element) {
        icons.push($(link).attr("src")?.split("/")?.pop()?.replace(/\..*/g, "") ?? "");
      });
    let commentsCount = "";
    if (icons.includes("icon_comment")) {
      $(this)
        .find("td")
        .find("img")
        .each(function (i: number, link: cheerio.Element) {
          const icon = $(link).attr("title");
          if (icon !== undefined && icon !== "") {
            commentsCount += $(link)
              .attr("title")
              ?.replace(/[^0-9]/g, "");
          }
        });
    }
    const torrent = {
      name: $(this).find("a.detLink").text(),
      category: "",
      link: $(this).find("a.detLink").attr("href") || "", // use empty string if undefined
      seeders: $(this).children("td:nth-child(3)").text(),
      leechers: $(this).children("td:nth-child(4)").text(),
      description: $(this).find("font.detDesc").text(),
      uploader: "",
      uploadDate: "",
      size: "",
      source: "",
      magnet: $(this).find('a[href^="magnet"]').attr("href") || "", // use empty string if undefined
      vip: icons.includes("vip"),
      trusted: icons.includes("trusted"),
      comments: icons.includes("icon_comment"),
      commentsCount: commentsCount,
    };
    if (torrent.link != undefined) {
      torrents.push(torrent);
    }
  });
  return torrents;
}

export default function Command() {
  const [query, setQuery] = useState<null | string>(null);
  const [state, setState] = useState<Result[]>([]);
  const [entries, setEntries] = useState<Result[]>([]);
  const [pages, setPages] = useState<Pages[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<string>("1");

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      if (page != undefined) {
        if (!query) {
          setQuery("*");
          setState([]);
          return;
        }
        try {
          await search(encodeURI(query), {
            baseURL: preferences.instance.value != null ? (preferences.instance.value as string) : "", // default https://thepiratebay.org
            page: Number(page), // default 0
            sortby: preferences.sortby.value != null ? (preferences.sortby.value as string) : "",
          })
            .then((res: Result[]) => setEntries(res))
            .catch(console.error);
        } catch (e) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to fetch entries",
            message: "Please try again later",
          });
        } finally {
          try {
            setLoading(true);
            await searchPages(encodeURI(query), {
              baseURL: preferences.instance.value != null ? (preferences.instance.value as string) : "",
              sortby: preferences.sortby.value != null ? (preferences.sortby.value as string) : "",
            })
              .then((pages: Pages[]) => setPages(pages))
              .catch(console.error);
          } catch (e) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Failed to fetch entries",
              message: "Please try again later",
            });
          } finally {
            setLoading(false);
          }
        }
      }
    }
    fetch();
  }, [query, page]);

  return (
    <List
      navigationTitle={`PirateBay Search`}
      filtering={false}
      onSearchTextChange={(text) => {
        setQuery(text);
      }}
      throttle
      searchBarPlaceholder="Search entry..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Category"
          storeValue={true}
          onChange={(newValue) => {
            setPage(newValue);
          }}
        >
          {pages.map((page) => (
            <List.Dropdown.Item
              key={page.value}
              title={page.title}
              value={page.value}
              keywords={[page.title, page.value]}
            />
          ))}
        </List.Dropdown>
      }
    >
      {entries.map((entry) => {
        if (entry.vip && entry.comments) {
          return (
            <List.Item
              key={entry.link}
              title={entry.name}
              // 					icon="icon.png"
              //subtitle={entry.content.replace("<em>", "").replace("</em>", "".replace("\n", "").replace("'", "").replace(" + ", ""))}
              accessories={[
                { tag: { value: "VIP", color: Color.Green } },
                { tag: { value: entry.commentsCount.toString(), color: Color.Yellow } },
                { icon: Icon.Upload, text: entry.seeders, tooltip: "seeders" },
                { icon: Icon.Download, text: entry.leechers, tooltip: "leechers" },
                // 						{ icon: Icon.Person, text: entry.description.split(/.*ULed by	/g).join(''), tooltip: "uploaded by" },
                // 					{ text: `An Accessory Text`, icon: Icon.Hammer },
                // 					{ text: { value: `A Colored Accessory Text`, color: Color.Orange }, icon: Icon.Hammer },
                {
                  icon: Icon.MemoryStick,
                  text: entry.description
                    .split(/.*Size /g)
                    .join("")
                    .split(/\.\d*/g)
                    .join("")
                    .split(/,.*/g)
                    .join("")
                    .split("i")
                    .join(""),
                  tooltip: "size",
                },
                // 					{ text: "Just Do It!" },
                // 					{ date: new Date(entry.date_publish) },
                {
                  tag: new Date(
                    entry.description
                      .split("Uploaded ")
                      .join("")
                      .split(/,.*/g)
                      .join("")
                      .split(" ")
                      .join("-")
                      .split(/\d\d:\d\d/g)
                      .join(new Date().getFullYear().toString())
                  ),
                },
              ]}
              actions={EntryActions(entry.name, entry.magnet, entry.link, "VIP")}
            />
          );
        } else if (entry.vip && !entry.comments) {
          return (
            <List.Item
              key={entry.link}
              title={entry.name}
              accessories={[
                { tag: { value: "VIP", color: Color.Green } },
                { icon: Icon.Upload, text: entry.seeders, tooltip: "seeders" },
                { icon: Icon.Download, text: entry.leechers, tooltip: "leechers" },
                // 						{ icon: Icon.Person, text: entry.description.split(/.*ULed by	/g).join(''), tooltip: "uploaded by" },
                // 					{ text: `An Accessory Text`, icon: Icon.Hammer },
                // 					{ text: { value: `A Colored Accessory Text`, color: Color.Orange }, icon: Icon.Hammer },
                {
                  icon: Icon.MemoryStick,
                  text: entry.description
                    .split(/.*Size /g)
                    .join("")
                    .split(/\.\d*/g)
                    .join("")
                    .split(/,.*/g)
                    .join("")
                    .split("i")
                    .join(""),
                  tooltip: "size",
                },
                // 					{ text: "Just Do It!" },
                // 					{ date: new Date(entry.date_publish) },
                {
                  tag: new Date(
                    entry.description
                      .split("Uploaded ")
                      .join("")
                      .split(/,.*/g)
                      .join("")
                      .split(" ")
                      .join("-")
                      .split(/\d\d:\d\d/g)
                      .join(new Date().getFullYear().toString())
                  ),
                },
              ]}
              actions={EntryActions(entry.name, entry.magnet, entry.link, "VIP")}
            />
          );
        } else if (entry.trusted && entry.comments) {
          return (
            <List.Item
              key={entry.link}
              title={entry.name}
              accessories={[
                { tag: { value: "Trusted", color: Color.Magenta } },
                { tag: { value: entry.commentsCount.toString(), color: Color.Yellow } },
                { icon: Icon.Upload, text: entry.seeders, tooltip: "seeders" },
                { icon: Icon.Download, text: entry.leechers, tooltip: "leechers" },
                {
                  icon: Icon.MemoryStick,
                  text: entry.description
                    .split(/.*Size /g)
                    .join("")
                    .split(/\.\d*/g)
                    .join("")
                    .split(/,.*/g)
                    .join("")
                    .split("i")
                    .join(""),
                  tooltip: "size",
                },
                {
                  tag: new Date(
                    entry.description
                      .split("Uploaded ")
                      .join("")
                      .split(/,.*/g)
                      .join("")
                      .split(" ")
                      .join("-")
                      .split(/\d\d:\d\d/g)
                      .join(new Date().getFullYear().toString())
                  ),
                },
              ]}
              actions={EntryActions(entry.name, entry.magnet, entry.link, "Trusted")}
            />
          );
        } else if (entry.trusted && !entry.comments) {
          return (
            <List.Item
              key={entry.link}
              title={entry.name}
              accessories={[
                { tag: { value: "Trusted", color: Color.Magenta } },
                { icon: Icon.Upload, text: entry.seeders, tooltip: "seeders" },
                { icon: Icon.Download, text: entry.leechers, tooltip: "leechers" },
                {
                  icon: Icon.MemoryStick,
                  text: entry.description
                    .split(/.*Size /g)
                    .join("")
                    .split(/\.\d*/g)
                    .join("")
                    .split(/,.*/g)
                    .join("")
                    .split("i")
                    .join(""),
                  tooltip: "size",
                },
                {
                  tag: new Date(
                    entry.description
                      .split("Uploaded ")
                      .join("")
                      .split(/,.*/g)
                      .join("")
                      .split(" ")
                      .join("-")
                      .split(/\d\d:\d\d/g)
                      .join(new Date().getFullYear().toString())
                  ),
                },
              ]}
              actions={EntryActions(entry.name, entry.magnet, entry.link, "Trusted")}
            />
          );
        } else if (entry.name && entry.comments) {
          return (
            <List.Item
              key={entry.link}
              title={entry.name}
              accessories={[
                { tag: { value: entry.commentsCount.toString(), color: Color.Yellow } },
                { icon: Icon.Upload, text: entry.seeders, tooltip: "seeders" },
                { icon: Icon.Download, text: entry.leechers, tooltip: "leechers" },
                {
                  icon: Icon.MemoryStick,
                  text: entry.description
                    .split(/.*Size /g)
                    .join("")
                    .split(/\.\d*/g)
                    .join("")
                    .split(/,.*/g)
                    .join("")
                    .split("i")
                    .join(""),
                  tooltip: "size",
                },
                {
                  tag: new Date(
                    entry.description
                      .split("Uploaded ")
                      .join("")
                      .split(/,.*/g)
                      .join("")
                      .split(" ")
                      .join("-")
                      .split(/\d\d:\d\d/g)
                      .join(new Date().getFullYear().toString())
                  ),
                },
              ]}
              actions={EntryActions(entry.name, entry.magnet, entry.link, "")}
            />
          );
        } else if (entry.name && !entry.comments) {
          return (
            <List.Item
              key={entry.link}
              title={entry.name}
              accessories={[
                { icon: Icon.Upload, text: entry.seeders, tooltip: "seeders" },
                { icon: Icon.Download, text: entry.leechers, tooltip: "leechers" },
                {
                  icon: Icon.MemoryStick,
                  text: entry.description
                    .split(/.*Size /g)
                    .join("")
                    .split(/\.\d*/g)
                    .join("")
                    .split(/,.*/g)
                    .join("")
                    .split("i")
                    .join(""),
                  tooltip: "size",
                },
                {
                  tag: new Date(
                    entry.description
                      .split("Uploaded ")
                      .join("")
                      .split(/,.*/g)
                      .join("")
                      .split(" ")
                      .join("-")
                      .split(/\d\d:\d\d/g)
                      .join(new Date().getFullYear().toString())
                  ),
                },
              ]}
              actions={EntryActions(entry.name, entry.magnet, entry.link, "")}
            />
          );
        }
      })}
    </List>
  );
}

function EntryActions(name: string, magnet: string, link: string, tag: string) {
  return (
    <ActionPanel>
      <Action.Push
        icon={Icon.Book}
        title="Read Details"
        target={<Details name={name} magnet={magnet} link={link} tag={tag} />}
      />
      <Action.Open icon={Icon.Logout} title="Open Magnet Link" target={magnet} />
      <Action.Open
        icon={Icon.Globe}
        title="Open Entry in Browser"
        target={link}
        shortcut={{ modifiers: ["opt"], key: "enter" }}
      />
    </ActionPanel>
  );
}

const Details = (props: { name: string; magnet: string; link: string; tag: string }) => {
  const [searchText, setSearchText] = useState("");
  const { isLoading, data } = useFetch(props.link, {
    // to make sure the screen isn't flickering when the searchText changes
    keepPreviousData: true,
    initialData: "",
  });

  const $ = cheerio.load(String(data));

  // ÜBERSCHRIFT
  let markdown = "# " + props.name + "\n";

  // Parse NFO
  let nfo = "";
  $(".nfo")
    .find("pre")
    .each(function (i, link) {
      nfo += $(link).text();
    });

  // NFO
  //sobald Daten da sind, werden sie in markdown überführt
  if (nfo) {
    markdown += nfo
      .split("~")
      .join("")
      .split("`")
      .join("")
      .replace(/(https?:\/\/(?:www\.|(?!www))[^\s.]+\.[^\s]{2,}|www\.[^\s]+\.[^\s]{2,})/gim, "[$1]($1)");
  }

  let latestComment = "";
  if ($("#comments").find(".comment").last().text().replace(/\n/, "")) {
    latestComment = $("#comments")
      .find(".comment")
      .last()
      .text()
      .replace(/^\s+|\s+$/g, "");
  } else {
    latestComment = "<no comments>";
  }

  const titles: string[] = [];
  $("#details")
    .find("dt")
    .each(function (i, link) {
      titles.push($(link).text());
      // 		nfo += $(link).text();
    });
  const values: string[] = [];
  $("#details")
    .find("dd")
    .each(function (i, link) {
      values.push($(link).text().replace(/\n/g, "").replace(/\t/g, ""));
      // 		nfo += $(link).text();
    });

  const details: { title: string; value: string }[] = [];
  for (let index = 0; index < titles.length; ++index) {
    const detailEntry = {
      title: titles[index].replace(":", ""),
      value: values[index],
    };
    details.push(detailEntry);
  }
  if (details.some((d) => d.title)) {
    // WAIT TILL WE HAVE THE DETAILS
    if (props.tag === "VIP") {
      return (
        <Detail
          navigationTitle={`PirateBay Search - ${props.name}`}
          isLoading={isLoading}
          markdown={markdown}
          metadata={
            <Detail.Metadata>
              <Detail.Metadata.Label
                title="Type"
                text={details.find((detail) => detail.title === "Type")?.value ?? ""}
              />
              <Detail.Metadata.Label
                title="Files"
                text={details.find((detail) => detail.title === "Files")?.value ?? ""}
              />
              <Detail.Metadata.Label
                title="Size"
                text={details.find((detail) => detail.title === "Size")?.value ?? ""}
              />
              <Detail.Metadata.Label
                title="Info Hash"
                text={$(".col2")
                  .last()
                  ?.html()
                  ?.replace(/.*dd>$/gm, "")
                  .replace(/.*dt>$/gm, "")
                  .replace(/.*a>$/gm, "")
                  .replace(/.*span>$/gm, "")
                  .replace(/.*br>$/gm, "")
                  .replace(/\s/g, "")
                  .replace(/.*i>/gm, "")}
              />
              <Detail.Metadata.Label
                title="Uploaded"
                text={
                  (details.find((detail) => detail.title === "Uploaded")?.value ?? "") &&
                  new Date(details.find((detail) => detail.title === "Uploaded")?.value ?? "").toLocaleDateString(
                    "de-DE",
                    {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    }
                  )
                }
              />
              <Detail.Metadata.Label title="By" text={details.find((detail) => detail.title === "By")?.value ?? ""} />
              <Detail.Metadata.TagList title="Tag">
                <Detail.Metadata.TagList.Item text={props.tag} color={Color.Green} />
              </Detail.Metadata.TagList>
              <Detail.Metadata.Label
                title="Seeders"
                text={details.find((detail) => detail.title === "Seeders")?.value ?? ""}
              />
              <Detail.Metadata.Label
                title="Leechers"
                text={details.find((detail) => detail.title === "Leechers")?.value ?? ""}
              />
              <Detail.Metadata.Separator />
              <Detail.Metadata.TagList title="Comments">
                <Detail.Metadata.TagList.Item
                  text={
                    details
                      .find((detail) => detail.title === "Comments")
                      ?.value?.replace(/\t/g, "")
                      .replace(" ", "") ?? ""
                  }
                  color={Color.Yellow}
                />
              </Detail.Metadata.TagList>
              <Detail.Metadata.Label title="Latest Comment" text={latestComment} />
            </Detail.Metadata>
          }
          actions={
            <ActionPanel>
              <Action.Open icon={Icon.Logout} title="Open Magnet Link" target={props.magnet} />
              <Action.Open
                icon={Icon.Globe}
                title="Open Entry in Browser"
                target={props.link}
                shortcut={{ modifiers: ["opt"], key: "enter" }}
              />
            </ActionPanel>
          }
        />
      );
    } else if (props.tag === "Trusted") {
      return (
        <Detail
          navigationTitle={`PirateBay Search - ${props.name}`}
          isLoading={isLoading}
          markdown={markdown}
          metadata={
            <Detail.Metadata>
              <Detail.Metadata.Label
                title="Type"
                text={details.find((detail) => detail.title === "Type")?.value ?? ""}
              />
              <Detail.Metadata.Label
                title="Files"
                text={details.find((detail) => detail.title === "Files")?.value ?? ""}
              />
              <Detail.Metadata.Label
                title="Size"
                text={details.find((detail) => detail.title === "Size")?.value ?? ""}
              />
              <Detail.Metadata.Label
                title="Info Hash"
                text={$(".col2")
                  .last()
                  ?.html()
                  ?.replace(/.*dd>$/gm, "")
                  .replace(/.*dt>$/gm, "")
                  .replace(/.*a>$/gm, "")
                  .replace(/.*span>$/gm, "")
                  .replace(/.*br>$/gm, "")
                  .replace(/\s/g, "")
                  .replace(/.*i>/gm, "")}
              />
              <Detail.Metadata.Label
                title="Uploaded"
                text={
                  (details.find((detail) => detail.title === "Uploaded")?.value ?? "") &&
                  new Date(details.find((detail) => detail.title === "Uploaded")?.value ?? "").toLocaleDateString(
                    "de-DE",
                    {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    }
                  )
                }
              />
              <Detail.Metadata.Label title="By" text={details.find((detail) => detail.title === "By")?.value ?? ""} />
              <Detail.Metadata.TagList title="Tag">
                <Detail.Metadata.TagList.Item text={props.tag} color={Color.Magenta} />
              </Detail.Metadata.TagList>
              <Detail.Metadata.Label
                title="Seeders"
                text={details.find((detail) => detail.title === "Seeders")?.value ?? ""}
              />
              <Detail.Metadata.Label
                title="Leechers"
                text={details.find((detail) => detail.title === "Leechers")?.value ?? ""}
              />
              <Detail.Metadata.Separator />
              <Detail.Metadata.TagList title="Comments">
                <Detail.Metadata.TagList.Item
                  text={
                    details
                      .find((detail) => detail.title === "Comments")
                      ?.value?.replace(/\t/g, "")
                      .replace(" ", "") ?? ""
                  }
                  color={Color.Yellow}
                />
              </Detail.Metadata.TagList>
              <Detail.Metadata.Label title="Latest Comment" text={latestComment} />
            </Detail.Metadata>
          }
          actions={
            <ActionPanel>
              <Action.Open icon={Icon.Logout} title="Open Magnet Link" target={props.magnet} />
              <Action.Open
                icon={Icon.Globe}
                title="Open Entry in Browser"
                target={props.link}
                shortcut={{ modifiers: ["opt"], key: "enter" }}
              />
            </ActionPanel>
          }
        />
      );
    } else {
      return (
        <Detail
          navigationTitle={`PirateBay Search - ${props.name}`}
          isLoading={isLoading}
          markdown={markdown}
          metadata={
            <Detail.Metadata>
              <Detail.Metadata.Label
                title="Type"
                text={details.find((detail) => detail.title === "Type")?.value ?? ""}
              />
              <Detail.Metadata.Label
                title="Files"
                text={details.find((detail) => detail.title === "Files")?.value ?? ""}
              />
              <Detail.Metadata.Label
                title="Size"
                text={details.find((detail) => detail.title === "Size")?.value ?? ""}
              />
              <Detail.Metadata.Label
                title="Info Hash"
                text={$(".col2")
                  .last()
                  ?.html()
                  ?.replace(/.*dd>$/gm, "")
                  .replace(/.*dt>$/gm, "")
                  .replace(/.*a>$/gm, "")
                  .replace(/.*span>$/gm, "")
                  .replace(/.*br>$/gm, "")
                  .replace(/\s/g, "")
                  .replace(/.*i>/gm, "")}
              />
              <Detail.Metadata.Label
                title="Uploaded"
                text={
                  (details.find((detail) => detail.title === "Uploaded")?.value ?? "") &&
                  new Date(details.find((detail) => detail.title === "Uploaded")?.value ?? "").toLocaleDateString(
                    "de-DE",
                    {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    }
                  )
                }
              />
              <Detail.Metadata.Label title="By" text={details.find((detail) => detail.title === "By")?.value ?? ""} />
              <Detail.Metadata.Label
                title="Seeders"
                text={details.find((detail) => detail.title === "Seeders")?.value ?? ""}
              />
              <Detail.Metadata.Label
                title="Leechers"
                text={details.find((detail) => detail.title === "Leechers")?.value ?? ""}
              />
              <Detail.Metadata.Separator />
              <Detail.Metadata.TagList title="Comments">
                <Detail.Metadata.TagList.Item
                  text={
                    details
                      .find((detail) => detail.title === "Comments")
                      ?.value?.replace(/\t/g, "")
                      .replace(" ", "") ?? ""
                  }
                  color={Color.Yellow}
                />
              </Detail.Metadata.TagList>
              <Detail.Metadata.Label title="Latest Comment" text={latestComment} />
            </Detail.Metadata>
          }
          actions={
            <ActionPanel>
              <Action.Open icon={Icon.Logout} title="Open Magnet Link" target={props.magnet} />
              <Action.Open
                icon={Icon.Globe}
                title="Open Entry in Browser"
                target={props.link}
                shortcut={{ modifiers: ["opt"], key: "enter" }}
              />
            </ActionPanel>
          }
        />
      );
    }
  } else {
    return null;
  }
};
