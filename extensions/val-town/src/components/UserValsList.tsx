import { List } from "@raycast/api";
import { useUserVals } from "../hooks/useUserVals";
import { Profile } from "../types";
import { useState } from "react";
import { SingleVal } from "./SingleVal";

export const UserValsList = ({ userId }: { userId?: Profile["id"] }) => {
  const [showDetail, setShowDetail] = useState(false);
  const { vals, isLoading } = useUserVals(userId);
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search your vals" isShowingDetail={showDetail}>
      {vals
        ?.filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i) // remove dups id
        ?.map((val) => (
          <SingleVal
            key={`user-val-${val.id}`}
            val={val}
            isShowingDetail={showDetail}
            onMainAction={() => setShowDetail((visible) => !visible)}
          />
        ))}
    </List>
  );
};
