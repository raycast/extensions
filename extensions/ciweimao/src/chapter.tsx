import {
  ActionPanel,
  Detail,
  getLocalStorageItem,
  PushAction,
  setLocalStorageItem,
  showToast,
  ToastStyle,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { runAppleScript } from "run-applescript";

import { chapterBuy, getCatalog, getChapter } from "./api";
import { Catalog } from "./catalog";

interface State {
  current?: number;
  cpts?: any[];
  txt?: string;
  error?: Error;
  auth: boolean;
  hlb: string;
  noBook: boolean;
}

export default function Command(props: { book_id: string; current?: number; cid?: string }) {
  const [state, setState] = useState<State>({ auth: true, hlb: "0", noBook: false });
  useEffect(() => {
    async function fetchData() {
      let bid = "";
      const lbid = await getLocalStorageItem("lbid");
      //如果未传入书籍 id，则从本地获取上次阅读记录
      if (!props.book_id) {
        if (lbid) {
          bid = String(lbid);
        } else {
          setState({ ...state, noBook: true, txt: "您尚未阅读过书籍" });
          return;
        }
      }
      //如果同时有传入 bid 和本地 bid，则进行对比，判断是否为同一本书(若未传入 bid 则直接认为是同一本书)
      const sameBook = props.book_id ? lbid === props.book_id : true;
      //设置本次阅读书籍的 id，以传入值为优先
      bid = props.book_id || bid;
      //更新本地书籍阅读记录
      setLocalStorageItem("lbid", bid);
      try {
        //获取书籍目录
        const res = await getCatalog(bid);
        state.cpts = res;
        let current = 0;
        // 获取当前应开启的章节 index：
        // 如果传入 index，就是用传入值，
        // 否则判断是否传入 chapter_id，如果传入，使用此值反推当前 index；
        // 如果依旧不存在，获取本地上次阅读书籍的 chapter_id，如果和当前是同一本书，则以此反推
        if (props.current) {
          current = props.current;
        } else {
          const lcid = await getLocalStorageItem("lcid");
          if (props.cid) {
            current = res.findIndex((c: any) => c.chapter_id === props.cid);
          } else if (lcid && sameBook) {
            current = res.findIndex((c: any) => c.chapter_id === lcid);
          }
        }
        setState({ ...state, current: current });
      } catch (error) {
        setState({ ...state, error: error instanceof Error ? error : new Error("Something went wrong") });
      }
    }
    fetchData();
  }, []);
  useEffect(() => {
    async function fetchData() {
      if (state.cpts && state.current !== undefined) {
        try {
          setState({ ...state, txt: undefined });
          const cptRes = await getChapter(state.cpts[state.current].chapter_id);
          // 更新本地阅读记录
          setLocalStorageItem("lcid", state.cpts[state.current].chapter_id);
          const cpt = `### ${cptRes.chapter_info.chapter_title}\n\n${cptRes.chapter_info.txt_content}\n\n${
            cptRes.chapter_info.author_say && !state.auth ? "### 作者的话\n\n" + cptRes.chapter_info.author_say : ""
          }`;
          setState({
            ...state,
            txt: cpt,
            auth: cptRes.chapter_info.auth_access !== "0",
            hlb: cptRes.chapter_info.unit_hlb,
          });
        } catch (error) {
          setState({ ...state, error: error instanceof Error ? error : new Error("Something went wrong") });
        }
      }
    }
    fetchData();
  }, [state.current]);
  if (state.error) {
    showToast(ToastStyle.Failure, "出错了", state.error.message);
  }
  async function nextCpt() {
    setState({ ...state, current: state.current! + 1 });
  }
  function prevCpt() {
    if (state.current == 0) {
      showToast(ToastStyle.Failure, "出错了", "已经是第一章了");
      return;
    }
    setState({ ...state, current: state.current! - 1 });
  }
  async function buyCpt() {
    await chapterBuy(state.cpts![state.current!].chapter_id);
    const current = state.current;
    setState({ ...state, current: undefined });
    setState({ ...state, current: current });
  }
  async function speakCpt() {
    await runAppleScript(`say "${state.txt}"`);
  }
  return (
    <Detail
      isLoading={!state.txt}
      markdown={state.txt}
      actions={
        state.noBook ? null : (
          <ActionPanel>
            {!state.auth ? (
              <ActionPanel.Item
                title={`购买(需 ${state.hlb} 币)`}
                onAction={() => buyCpt()}
                icon={{ source: "../assets/buy.png" }}
              />
            ) : null}
            <ActionPanel.Item title="下一章" onAction={() => nextCpt()} icon={{ source: "../assets/right.png" }} />
            <ActionPanel.Item title="上一章" onAction={() => prevCpt()} icon={{ source: "../assets/left.png" }} />
            <ActionPanel.Item title="刷新" onAction={() => prevCpt()} icon={{ source: "../assets/refresh.png" }} />
            <PushAction
              icon={{ source: "../assets/catalog.png" }}
              title="目录"
              target={<Catalog book_id={props.book_id} />}
            />
            <ActionPanel.Item title="朗读" onAction={() => speakCpt()} icon={{ source: "../assets/voice.png" }} />
          </ActionPanel>
        )
      }
    />
  );
}
