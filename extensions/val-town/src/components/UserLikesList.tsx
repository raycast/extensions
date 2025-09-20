import { List } from "@raycast/api";
import { Profile } from "../types";
import { useState } from "react";
import { SingleVal } from "./SingleVal";
import { useLikedVals } from "../hooks/useLikedVals";

export const UserLikesList = ({ userId }: { userId?: Profile["id"] }) => {
  const [showDetail, setShowDetail] = useState(false);
  const { vals, isLoading } = useLikedVals(userId);
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search your liked vals" isShowingDetail={showDetail}>
      {vals
        ?.filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i) // remove dups id
        ?.map((val) => (
          <SingleVal
            key={`liked-val-${val.id}`}
            val={val}
            isShowingDetail={showDetail}
            onMainAction={() => setShowDetail((visible) => !visible)}
          />
        ))}
    </List>
  );
};
