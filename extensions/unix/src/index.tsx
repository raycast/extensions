import { List, LaunchProps } from "@raycast/api";
import { useState, useEffect } from "react";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn"; // 导入本地化语言

interface Item {
  label: string;
  value: string;
  id: number;
}

dayjs.locale("zh-cn"); // 使用本地化语言
export default function Command(props: { arguments: { timestamp: string } }) {
  const [value, setValue] = useState<string>("");
  const [list, setList] = useState<Array<Item>>([]);

  const timestampChange = (v: string) => {
    setValue(v);
    const fmt = "YYYY-MM-DD HH:mm:ss";
    if (v) {
      if (v.length === 10 && !isNaN(Number(v))) {
        setList([{ label: dayjs.unix(Number(v)).format(fmt), value: v, id: Math.random() }, ...list]);
      } else if (v.length === 13 && !isNaN(Number(v))) {
        setList([{ label: dayjs(Number(v)).format(fmt), value: v, id: Math.random() }, ...list]);
      }
    }
  };

  useEffect(() => {
    if (props?.arguments?.timestamp) {
      timestampChange(props.arguments.timestamp);
    }
  }, []);

  return (
    <>
      <List
        searchText={value}
        onSearchTextChange={timestampChange}
        navigationTitle="timestamp"
        searchBarPlaceholder="格式化 unix 时间戳"
      >
        {list.map((item) => (
          <List.Item key={item.id} title={item.label} subtitle={item.value} />
        ))}
      </List>
    </>
  );
}
