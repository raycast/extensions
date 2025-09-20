import { useEffect, useState } from "react";
import { List } from "@raycast/api";
import { fetchUnPress } from "./api.js";
import { PressDetail } from "./components.js";
import { UnPress } from "./types.js";

export default function () {
  const [isLoading, setIsLoading] = useState(true);
  const [pressList, setPressList] = useState<UnPress[]>([]);
  const [isShowingDetail, setIsShowingDetail] = useState(false);

  const loadPress = async () => {
    setIsLoading(true);
    const pressList = await fetchUnPress();
    setPressList(pressList);
    setIsLoading(false);
  };

  useEffect(() => {
    loadPress();
  }, []);

  return (
    <List isLoading={isLoading} isShowingDetail={isShowingDetail}>
      {pressList.map((press, index) => {
        return (
          <PressDetail
            key={`press-${index}`}
            press={press}
            onToggleDetail={() => setIsShowingDetail(!isShowingDetail)}
          />
        );
      })}
    </List>
  );
}
