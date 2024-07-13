import { ActionPanel, List, showToast, ToastStyle, useNavigation, copyTextToClipboard, popToRoot } from "@raycast/api";
import { useState, useEffect } from "react";
import axios from "axios";
import qs from "qs";

type AddressItem = {
  roadAddr: string;
  zipNo: string;
};

export default function Command() {
  const [query, setQuery] = useState<string>("");
  const [results, setResults] = useState<AddressItem[]>([]); // 초기 상태를 빈 배열로 설정
  const { push } = useNavigation();

  useEffect(() => {
    if (query.length > 0) {
      const fetchData = async () => {
        try {
          // 띄어쓰기를 +로 변환
          const keyword = query.replace(/ /g, "+");
          const queryParams = qs.stringify({
            currentPage: "1",
            countPerPage: "10",
            resultType: "json",
            keyword: keyword,
            confmKey: "U01TX0FVVEgyMDIxMDQwOTEwMTMzOTExMTAyNzA=",
          });

          const url = `https://www.juso.go.kr/addrlink/addrEngApi.do?${queryParams}`;
          const response = await axios.get(url);
          const data = response.data.results.juso;
          setResults(data || []); // 데이터가 없을 경우 빈 배열로 설정
        } catch (error) {
          if (error instanceof Error) {
            showToast(ToastStyle.Failure, "Failed to fetch data", error.message);
          } else {
            showToast(ToastStyle.Failure, "Failed to fetch data", "Unknown error");
          }
        }
      };

      fetchData();
    } else {
      setResults([]); // query가 없을 경우 빈 배열로 설정
    }
  }, [query]);

  const handleCopy = async (text: string) => {
    await copyTextToClipboard(text);
    popToRoot(); // 클립보드 복사 후 확장 종료
  };

  return (
    <List
      searchBarPlaceholder="Enter address keyword"
      onSearchTextChange={setQuery}
      throttle
    >
      {results.map((item, index) => (
        <List.Item
          key={index}
          title={item.roadAddr}
          subtitle={`${item.roadAddr} ${item.zipNo}`}
          actions={
            <ActionPanel>
              <ActionPanel.Item title="Copy Address" onAction={() => handleCopy(`${item.roadAddr} ${item.zipNo}`)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
