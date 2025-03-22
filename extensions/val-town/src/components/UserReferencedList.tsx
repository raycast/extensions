import { List } from "@raycast/api";
import { Profile } from "../types";
import { useState } from "react";
import { SingleVal } from "./SingleVal";
import { useReferencedVals } from "../hooks/useReferencedVals";

export const UserReferencedList = ({ userId }: { userId?: Profile["id"] }) => {
  const [showDetail, setShowDetail] = useState(false);
  const { vals, isLoading } = useReferencedVals(userId);
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search your referenced vals" isShowingDetail={showDetail}>
      {vals
        ?.filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i) // remove dups id
        ?.map((val) => (
          <SingleVal
            key={`referenced-val-${val.id}`}
            val={val}
            isShowingDetail={showDetail}
            onMainAction={() => setShowDetail((visible) => !visible)}
          />
        ))}
    </List>
  );
};
