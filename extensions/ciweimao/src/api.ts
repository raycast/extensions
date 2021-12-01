import { getLocalStorageItem, getPreferenceValues, setLocalStorageItem, showToast, ToastStyle } from "@raycast/api";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import constant from "./constant";
import { decrypt } from "./decrypt";

const ajax = axios.create({
  baseURL: constant.baseUrl,
  timeout: constant.timeout,
  withCredentials: true,
  headers: {
    "user-agent": constant.ua,
  },
});

ajax.interceptors.request.use(async (config: AxiosRequestConfig) => {
  const preferences = await getPreferenceValues();
  const { login_token, account } = preferences;
  if (config.method === "get") {
    config.params = { ...config.params, ...constant.loginPara, login_token, account };
  }
  return config;
});

ajax.interceptors.response.use((response: AxiosResponse) => {
  const res: any = JSON.parse(decrypt(response.data));
  if (!res.data) {
    showToast(
      res.code != 100000 ? ToastStyle.Failure : ToastStyle.Success,
      res.code != 100000 ? "请求失败" : "请求完成",
      res.tip
    );
  }
  return res.data;
});

/**
 * 获取书架列表
 */
export const getShelfList = () => {
  return ajax.get("/bookshelf/get_shelf_list");
};

/**
 * 获取书架书籍
 */
export const getShelfBookList = (shelf_id: string) => {
  return ajax.get("/bookshelf/get_shelf_book_list_new", {
    params: {
      count: 999,
      shelf_id,
    },
  });
};

/**
 * 获取目录(带缓存)
 */
export const getCatalog = async (book_id: string, force = false) => {
  // 如若强行更新，则先清空本地缓存
  if (force) await setLocalStorageItem(`cata-${book_id}`, "{}");
  // 预读取章节数据
  const objStr: any = (await getLocalStorageItem(`cata-${book_id}`)) || "{}";
  const obj = JSON.parse(objStr);
  const newObj: any = {};
  // 获取卷列表
  let res: any = await ajax.get("/book/get_division_list", {
    params: {
      book_id,
    },
  });
  const list = res.division_list;
  const catalog: any = [];
  // 已缓存的卷 id
  const localCataKeys = Object.keys(obj);
  // 获取章节列表的起点
  let begin =
    localCataKeys.length === 0
      ? 0
      : list.findIndex((item: any) => item.division_id == localCataKeys[localCataKeys.length - 1]);
  // 预填充数据
  localCataKeys.forEach((key: string, index: number) => {
    if (index < localCataKeys.length - 1) {
      newObj[key] = obj[key];
      catalog.push(...obj[key]);
    }
  });
  for (; begin < list.length; begin++) {
    const division = list[begin];
    res = await ajax.get("/chapter/get_updated_chapter_by_division_id", {
      params: {
        division_id: division.division_id,
      },
    });
    catalog.push(...res.chapter_list);
    newObj[division.division_id] = res.chapter_list;
  }
  setLocalStorageItem(`cata-${book_id}`, JSON.stringify(newObj));
  return catalog;
};

/**
 * 获取章节内容
 */
export const getChapter = async (chapter_id: string) => {
  let res: any = await ajax.get("/chapter/get_chapter_cmd", {
    params: {
      chapter_id,
    },
  });
  const cmd = res.command;
  res = await ajax.get("/chapter/get_cpt_ifm", {
    params: {
      chapter_id,
      chapter_command: cmd,
    },
  });
  res.chapter_info.txt_content = decrypt(res.chapter_info.txt_content, cmd);
  res.chapter_info.txt_content = res.chapter_info.txt_content.replace(/\n/g, "\n\n");
  res.chapter_info.author_say = res.chapter_info.author_say.replace(/\n/g, "\n\n");
  return res;
};

/**
 * 购买章节
 */
export const chapterBuy = (chapter_id: string) => {
  return ajax.get("/chapter/buy", {
    params: { chapter_id },
  });
};

/**
 * 删除书籍
 */
export const deleteShelfBook = (book_id: string, shelf_id: string) => {
  return ajax.get("/bookshelf/delete_shelf_book", {
    params: {
      shelf_id,
      book_id,
    },
  });
};

/**
 * 搜索书籍
 */
export const searchBook = (key: string) => {
  return ajax.get("/bookcity/get_filter_search_book_list", {
    params: {
      key,
      count: 100,
      page: 0,
      category_index: 0,
    },
  });
};

/**
 * 添加书架
 */
export const favor = (book_id: string, shelf_id: string) => {
  return ajax.get("/bookshelf/favor", {
    params: {
      book_id,
      shelf_id,
    },
  });
};
