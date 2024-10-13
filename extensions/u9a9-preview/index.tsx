import { showToast, Toast, List } from "@raycast/api";
import axios from "axios";
import React, { useState, useEffect } from "react";

// 假设你有一个配置文件或环境变量来存储 URL
const BASE_URL = "https://u9a9.net";

interface DataItem {
  date: string;
  // 添加其他必要的字段
}

async function fetchData(searchTerm: string = "", page: number = 1): Promise<DataItem[] | null> {
  const url = `${BASE_URL}/?type=2&search=${searchTerm}&p=${page}`;
  try {
    const response = await axios.get(url, {
      timeout: 5000, // 设置超时时间为5秒
    });
    // 假设 response.data 是一个包含 DataItem 的数组
    const data: DataItem[] = response.data;
    
    // 按日期倒序排序
    return data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    // 错误处理逻辑保持不变
    if (axios.isAxiosError(error)) {
      if (!error.response) {
        await showToast({
          style: Toast.Style.Failure,
          title: "网络连接失败",
          message: "请检查您的网络连接并重试",
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "服务器错误",
          message: `错误代码: ${error.response.status}`,
        });
      }
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "获取数据失败",
        message: "请稍后重试",
      });
    }
    return null;
  }
}

export default function Command() {
  const [data, setData] = useState<DataItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const result = await fetchData();
        if (result === null) {
          throw new Error("Failed to fetch data");
        }
        setData(result);
      } catch (err) {
        if (err instanceof Error) {
          setError(err);
        } else {
          setError(new Error("An unknown error occurred"));
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (error) {
    return <List><List.EmptyView title="发生错误" description="请重新启动应用程序并重试" /></List>;
  }

  if (!data) {
    return <List><List.EmptyView title="无法加载数据" description="请检查网络连接并重试" /></List>;
  }

  // 渲染排序后的数据
  return (
    <List>
      {data.map((item, index) => (
        <List.Item
          key={index}
          title={item.date}
          // 添加其他你想显示的字段
        />
      ))}
    </List>
  );
}
