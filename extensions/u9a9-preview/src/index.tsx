import React, { useState, useEffect, useCallback } from "react";
import {
  ActionPanel,
  Action,
  List,
  getPreferenceValues,
  showToast,
  Toast,
  Detail,
} from "@raycast/api";
import axios from "axios";
import * as cheerio from "cheerio";

interface Preferences {
  websiteUrl: string;
}

interface ListItem {
  title: string;
  url: string;
  size: string;
  date: string;
  imageUrl: string;
}

interface DetailItem extends ListItem {
  description: string;
  magnetLink: string;
  imageUrls: string[]; // 添加这一行
}

export default function Command() {
  const [items, setItems] = useState<ListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { websiteUrl } = getPreferenceValues<Preferences>();

  const fetchData = useCallback(async (query: string, page: number) => {
    console.log(`开始获取数据，当前页：${page}，搜索词：${query}`);
    setIsLoading(true);
    try {
      const url = `${websiteUrl}/?type=2&search=${encodeURIComponent(query)}&p=${page}`;
      console.log(`Fetching data from: ${url}`);
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      const newItems: ListItem[] = [];

      $("table.torrent-list tbody tr").each((index, element) => {
        const title = $(element).find("td:nth-child(2) a").text().trim();
        const url = $(element).find("td:nth-child(2) a").attr("href");
        const size = $(element).find("td:nth-child(4)").text().trim();
        const date = $(element).find("td:nth-child(5)").text().trim();
        const imageUrl =
          $(element).find("td:nth-child(1) img").attr("src") || "";
        if (title && url) {
          newItems.push({
            title,
            url: websiteUrl + url,
            size,
            date,
            imageUrl: websiteUrl + imageUrl,
          });
        }
      });

      // 解析总页数
      const paginationItems = $(".pagination li");
      if (paginationItems.length > 2) {
        const lastPageLink = paginationItems.eq(-2).find('a');
        if (lastPageLink.length) {
          const lastPageNumber = parseInt(lastPageLink.text());
          if (!isNaN(lastPageNumber)) {
            setTotalPages(lastPageNumber);
          }
        }
      }

      setItems(newItems);
      console.log(`数据获取完成，总页数：${totalPages}，项目数：${newItems.length}`);
    } catch (error) {
      console.error("Error fetching data:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "获取数据时出错",
        message: error instanceof Error ? error.message : String(error),
      });
    }
    setIsLoading(false);
  }, [websiteUrl]);

  useEffect(() => {
    console.log("搜索文本改变，重置到第一页");
    setCurrentPage(1);
    fetchData(searchText, 1);
  }, [searchText, fetchData]);

  const changePage = useCallback((page: number) => {
    console.log(`切换到第 ${page} 页`);
    setCurrentPage(page);
    fetchData(searchText, page);
  }, [searchText, fetchData]);

  async function fetchDetailData(url: string): Promise<DetailItem> {
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);

      const description = $(".torrent-description").text().trim();
      const magnetLink = $("a[href^='magnet:']").attr("href") || "";
      
      // 只查找 panel-body 内的图片元素
      const imageUrls: string[] = [];
      $(".panel-body img").each((index, element) => {
        let imgSrc = $(element).attr("src");
        if (imgSrc) {
          // 如果是相对路径，将其转换为绝对路径
          if (!imgSrc.startsWith("http")) {
            imgSrc = new URL(imgSrc, websiteUrl).toString();
          }
          imageUrls.push(imgSrc);
        }
      });

      console.log("Detail image URLs:", imageUrls); // 添加日志

      return {
        title: $("h1").text().trim(),
        url,
        size: $(".panel-body .row:first-child .col-md-5:last-child").text().trim(),
        date: $(".panel-body .row:first-child .col-md-5:nth-child(2)").text().trim(),
        description,
        magnetLink,
        imageUrl: imageUrls[0] || "", // 使用第一张图片作为主图
        imageUrls: imageUrls, // 保存所有图片URL
      };
    } catch (error) {
      console.error("Error fetching detail data:", error);
      throw error;
    }
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="输入搜索关键词..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="选择页面"
          storeValue={true}
          onChange={(newValue) => {
            console.log(`下拉菜单选择了新值：${newValue}`);
            changePage(parseInt(newValue));
          }}
        >
          <List.Dropdown.Section title="页面">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <List.Dropdown.Item key={page} title={`第 ${page} 页`} value={page.toString()} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.Section title="搜索结果" subtitle={`第 ${currentPage}/${totalPages} 页`}>
        {items.map((item, index) => (
          <List.Item
            key={index}
            title={item.title}
            subtitle={`大小: ${item.size} | 日期: ${item.date}`}
            icon={item.imageUrl}
            actions={
              <ActionPanel>
                <Action.Push
                  title="查看详情"
                  target={
                    <DetailView item={item} fetchDetailData={fetchDetailData} />
                  }
                />
                <Action.CopyToClipboard content={item.url} />
                <Action.OpenInBrowser url={item.url} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function DetailView({
  item,
  fetchDetailData,
}: {
  item: ListItem;
  fetchDetailData: (url: string) => Promise<DetailItem>;
}) {
  const [detailItem, setDetailItem] = useState<DetailItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDetailData() {
      try {
        const data = await fetchDetailData(item.url);
        setDetailItem(data);
      } catch (error) {
        console.error("Error loading detail data:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "加载详情失败",
          message: "无法获取详细信息",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadDetailData();
  }, [item.url, fetchDetailData]);

  if (isLoading) {
    return <Detail isLoading={true} />;
  }

  if (!detailItem) {
    return <Detail markdown="无法加载详细信息" />;
  }

  const markdown = `
# ${detailItem.title}

${detailItem.imageUrls?.map(url => `![图片](${url})`).join('\n') || ''}

**大小:** ${detailItem.size}
**日期:** ${detailItem.date}

## 描述

${detailItem.description}

## 链接

[磁力链接](${detailItem.magnetLink})
  `;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            content={detailItem.magnetLink}
            title="复制磁力链接"
          />
          <Action.OpenInBrowser url={detailItem.url} title="在浏览器中打开" />
          {detailItem.imageUrls?.map((url, index) => (
            <Action.OpenInBrowser key={index} url={url} title={`在浏览器中查看图片 ${index + 1}`} />
          ))}
        </ActionPanel>
      }
    />
  );
}
