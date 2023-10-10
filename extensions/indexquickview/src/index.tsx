import { ActionPanel, List, Action } from "@raycast/api";
import { useState, useEffect } from "react";
import { Parser } from "htmlparser2";
import fetch from "node-fetch";

export type LoadingStatus = "loading" | "success" | "failure";

export default function Command() {
  const [status, setStatus] = useState<LoadingStatus>("loading");
  const [hs300, setSh300] = useState(String);
  const [sh001, setSh001] = useState(String);
  const [int_nasdaq, setInt_nasdaq] = useState(String);
  const [int_sp500, setInt_sp500] = useState(String);
  const [int_nikkei, setInt_nikkei] = useState(String);
  const [int_dji, setInt_dji] = useState(String);
  const [b_FSSTI, setB_FSSTI] = useState(String);

  const [temperature, setTemperature] = useState(String);
  const [temcomment, setTemcomment] = useState(String);
  const [debtTemperature, setDebtTemperature] = useState(String);

  let isTemperature = false;
  let isDebtTemperatureUp = false;
  let isDebtTemperatureDown = false;
  let isthefirst = false;

  useEffect(() => {
    async function fetchData() {
      try {
        // 获取上证指数
        const shResponse = await fetch("http://hq.sinajs.cn?list=s_sh000001", {
          headers: { Referer: "http://finance.sina.com.cn" },
        });
        const shData = await shResponse.text();
        const shDataArry = shData.split(",");
        const shIndex = Number(shDataArry[1]).toFixed(2);
        setSh001(shIndex);
        setStatus("success");

        // 获取沪深指数
        const hsResponse = await fetch("http://hq.sinajs.cn?list=s_sz399001", {
          headers: { Referer: "http://finance.sina.com.cn" },
        });
        const hsData = await hsResponse.text();
        const hsDataArry = hsData.split(",");
        const hsIndex = Number(hsDataArry[1]).toFixed(2);
        setSh300(hsIndex);

        // 获取纳斯达克指数
        const nasdaqResponse = await fetch("http://hq.sinajs.cn?list=int_nasdaq", {
          headers: { Referer: "http://finance.sina.com.cn" },
        });
        const nasdaqData = await nasdaqResponse.text();
        const nasdaqDataArry = nasdaqData.split(",");
        const nasdaqIndex = Number(nasdaqDataArry[1]).toFixed(2);
        setInt_nasdaq(nasdaqIndex);

        // 获取标普500指数
        const sp500Response = await fetch("http://hq.sinajs.cn?list=int_sp500", {
          headers: { Referer: "http://finance.sina.com.cn" },
        });
        const sp500Data = await sp500Response.text();
        const sp500DataArry = sp500Data.split(",");
        const sp500Index = Number(sp500DataArry[1]).toFixed(2);
        setInt_sp500(sp500Index);

        // 获取日经指数
        const nikkeiResponse = await fetch("http://hq.sinajs.cn?list=int_nikkei", {
          headers: { Referer: "http://finance.sina.com.cn" },
        });
        const nikkeiData = await nikkeiResponse.text();
        const nikkeiDataArry = nikkeiData.split(",");
        const nikkeiIndex = Number(nikkeiDataArry[1]).toFixed(2);
        setInt_nikkei(nikkeiIndex);

        // 获取道琼斯指数
        const djiResponse = await fetch("http://hq.sinajs.cn?list=int_dji", {
          headers: { Referer: "http://finance.sina.com.cn" },
        });
        const djiData = await djiResponse.text();
        const djiDataArry = djiData.split(",");
        const djiIndex = Number(djiDataArry[1]).toFixed(2);
        setInt_dji(djiIndex);

        // 获取新加坡指数
        const FSSTIResponse = await fetch("http://hq.sinajs.cn?list=b_FSSTI", {
          headers: { Referer: "http://finance.sina.com.cn" },
        });
        const FSSTIData = await FSSTIResponse.text();
        const FSSTIDataArry = FSSTIData.split(",");
        const FSSTIIndex = Number(FSSTIDataArry[1]).toFixed(2);
        setB_FSSTI(FSSTIIndex);

        // 获取有知有行数据
        const yzResponse = await fetch("https://youzhiyouxing.cn/data");
        const html = await yzResponse.text();

        let temcomment = "";

        // 创建一个新的 HTML 解析器
        const parser = new Parser({
          ontext: (text) => {
            // 处理文本节点
            if (isTemperature) {
              const temperature = text.trim();
              setTemperature(temperature);
              // setStatus("success");
              isTemperature = false;
            } else if (isDebtTemperatureUp) {
              const debtTemperature = text.trim() + " 温度上升";
              setDebtTemperature(debtTemperature);
              // setStatus("success");
              isDebtTemperatureUp = false;
            } else if (isDebtTemperatureDown) {
              const debtTemperature = text.trim() + " 温度下降";
              setDebtTemperature(debtTemperature);
              isDebtTemperatureDown = false;
            } else if (isthefirst) {
              temcomment += text.trim() + " ";
              setTemcomment(temcomment);
              isthefirst = false;
            }
          },
          onopentag: (name, attributes) => {
            // 如果是温度元素，获取温度值
            if (name === "div" && attributes.class === "tw-text-[40px] tw-font-semibold") {
              isTemperature = true;
            } else if (name === "span" && attributes.class === "tw-font-semibold trend-gt") {
              isDebtTemperatureUp = true;
            } else if (name === "span" && attributes.class === "tw-font-semibold trend-lt") {
              isDebtTemperatureDown = true;
            } else if (name === "div" && attributes.class === "tw-leading-normal") {
              isthefirst = true;
            }
          },
          onclosetag: (name) => {
            // 处理结束标签
          },
          onerror: (error) => {
            // 处理错误
          },
          onend: () => {
            // 解析结束
          },
        });

        // 将 HTML 代码传递给解析器
        parser.write(html);
        parser.end();
      } catch (error) {
        console.error(error);
        setStatus("failure");
        setSh001("Failed to fetch data");
      }
    }
    fetchData();
  }, []);

  return (
    <List isLoading={status === "loading"}>
      <List.Item
        title="有知有行全市场温度"
        subtitle={temperature === "" ? "Loading..." : temperature + " " + temcomment}
        actions={
          <ActionPanel title="打开有知有行数据源">
            <Action.OpenInBrowser url="https://youzhiyouxing.cn/data" />
          </ActionPanel>
        }
      />
      <List.Item
        title="有知有行债市温度"
        subtitle={debtTemperature === "" ? "Loading..." : debtTemperature}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url="https://youzhiyouxing.cn/data" />
          </ActionPanel>
        }
      />
      <List.Item title="上证指数" subtitle={sh001 === "" ? "Loading..." : sh001} />
      <List.Item title="深证指数" subtitle={hs300 === "" ? "Loading..." : hs300} />
      <List.Item title="纳斯达克指数" subtitle={int_nasdaq === "" ? "Loading..." : int_nasdaq} />
      <List.Item title="标普500指数" subtitle={int_sp500 === "" ? "Loading..." : int_sp500} />
      <List.Item title="道琼斯指数" subtitle={int_dji === "" ? "Loading..." : int_dji} />
      <List.Item title="新加坡指数" subtitle={b_FSSTI === "" ? "Loading..." : b_FSSTI} />
      <List.Item title="日经指数" subtitle={int_nikkei === "" ? "Loading..." : int_nikkei} />
    </List>
  );
}
