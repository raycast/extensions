import { ActionPanel, Action, Icon, List, Detail, open, showToast, Toast } from "@raycast/api";
import axios from "axios";
import { load } from "cheerio";
import { useEffect, useState } from "react";
import fs from "fs";
import path from "path";

interface Article {
  id: number;
  icon: string;
  title: string;
  subtitle: string;
  accessory: string;
  favicon: string;
  thumbnailLink: string;
  source: string;
  agency: string;
}

const CACHE_FILE_PATH = path.join(__dirname, "cache.json");
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

export default function Command() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  useEffect(() => {
    const fetchHeadlines = async () => {
      try {
        const cachedData = getCachedData();
        if (cachedData) {
          setArticles(cachedData);
          return;
        }

        const response = await axios.get("https://www.smerconish.com/headlines");
        const $ = load(response.data);
        const articles: Article[] = [];

        const fetchFavicon = async (url: string) => {
          try {
            const response = await axios.get(`https://www.google.com/s2/favicons?domain=${new URL(url).hostname}`);
            return response.config.url || "";
          } catch (error) {
            console.error("Error fetching favicon:", error);
            return Icon.Globe;
          }
        };

        const promises = $("article.elementor-grid-item")
          .slice(0, 20)
          .map(async (index, element) => {
            const title = $(element).find(".article__title a").text();
            const link = $(element).find(".article__title a").attr("href") || "";
            const description = $(element).find(".article__excerpt").text().trim();
            const image =
              $(element).find(".article__thumbnail img").attr("data-lazy-src") ||
              $(element).find(".article__thumbnail img").attr("src") ||
              "";
            const thumbnailLink = $(element).find(".article__thumbnail__link").attr("href") || link;
            const favicon = await fetchFavicon(link);
            const source = new URL(link).hostname;
            const agency = $(element).find(".article__source").text().trim();

            articles.push({
              id: index,
              icon: image || Icon.Bird,
              title,
              subtitle: description,
              accessory: link,
              favicon,
              thumbnailLink,
              source,
              agency,
            });
          })
          .get();

        await Promise.all(promises);
        setArticles(articles);
        cacheData(articles);
      } catch (error) {
        console.error("Error fetching headlines:", error);
        showToast(Toast.Style.Failure, "Failed to fetch headlines");
      }
    };

    fetchHeadlines();
  }, []);

  const getCachedData = (): Article[] | null => {
    if (!fs.existsSync(CACHE_FILE_PATH)) {
      return null;
    }

    const cache = JSON.parse(fs.readFileSync(CACHE_FILE_PATH, "utf-8"));
    if (Date.now() - cache.timestamp > CACHE_DURATION) {
      return null;
    }

    return cache.articles;
  };

  const cacheData = (articles: Article[]) => {
    const cache = {
      timestamp: Date.now(),
      articles,
    };
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(cache), "utf-8");
  };

  const handlePreview = (article: Article, index: number) => {
    setSelectedArticle(article);
    setCurrentIndex(index);
  };

  const handleNextStory = () => {
    const nextIndex = (currentIndex + 1) % articles.length;
    setSelectedArticle(articles[nextIndex]);
    setCurrentIndex(nextIndex);
  };

  const handlePreviousStory = () => {
    const previousIndex = (currentIndex - 1 + articles.length) % articles.length;
    setSelectedArticle(articles[previousIndex]);
    setCurrentIndex(previousIndex);
  };

  if (selectedArticle) {
    const nextArticle = articles[(currentIndex + 1) % articles.length];
    const previousArticle = articles[(currentIndex - 1 + articles.length) % articles.length];

    return (
      <Detail
        markdown={`
## ${selectedArticle.title}
---
${selectedArticle.subtitle}

<img src="${selectedArticle.icon}" alt="Thumbnail" style="max-width: 80px; height: auto; float: right; margin-left: 20px;" />

`}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Source" text={selectedArticle.agency} icon={selectedArticle.favicon} />
            <Detail.Metadata.Link title="" target={selectedArticle.accessory} text={selectedArticle.source} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Previous Article" text={previousArticle.title} />
            <Detail.Metadata.Label title="Next Article" text={nextArticle.title} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label icon="smerconish.png" title="Find more at:" text="Smerconish.com" />
            <Detail.Metadata.Link title="" target="https://smerconish.com/headlines" text="Headlines" />
            <Detail.Metadata.Link title="" target="https://www.smerconish.com/daily-poll/" text="Daily Poll" />
            <Detail.Metadata.Link title="" target="https://www.smerconish.com/cartoon-gallery/" text="Cartoons" />
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            <Action title="Open in Browser" onAction={() => open(selectedArticle.accessory)} />
            <Action title="Next Story" onAction={handleNextStory} shortcut={{ modifiers: ["cmd"], key: "return" }} />
            <Action
              title="Previous Story"
              onAction={handlePreviousStory}
              shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
            />
            <Action
              title="Back"
              onAction={() => setSelectedArticle(null)}
              shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List searchBarPlaceholder="Search Smerconish.com/Headlines">
      <List.Section title="Latest Headlines from Smerconish.com">
        {articles.map((item, index) => (
          <List.Item
            key={item.id}
            icon={item.favicon}
            title={item.title}
            subtitle={item.subtitle}
            detail={<List.Item.Detail markdown={`![Image](${item.icon})\n\n**${item.title}**\n\n${item.subtitle}`} />}
            actions={
              <ActionPanel>
                <Action title="Preview" onAction={() => handlePreview(item, index)} />
                <Action.OpenInBrowser url={item.accessory} />
                <Action.CopyToClipboard content={item.title} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
