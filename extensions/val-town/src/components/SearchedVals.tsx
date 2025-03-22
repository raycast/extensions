import { Val } from "../types";
import { SingleVal } from "./SingleVal";

type SearchedValsProps = {
  vals: Val[];
  isShowingDetail: boolean;
  setShowDetail: React.Dispatch<React.SetStateAction<boolean>>;
};

export const SearchedVals = ({ vals, isShowingDetail, setShowDetail }: SearchedValsProps) => (
  <>
    {vals
      .filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i) // remove dups id
      .map((val) => (
        <SingleVal
          key={`searched-val-${val.id}`}
          val={val}
          isShowingDetail={isShowingDetail}
          includeVisibility={false}
          forceShowUsername={true}
          onMainAction={() => setShowDetail((visible) => !visible)}
        />
      ))}
  </>
);
