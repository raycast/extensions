import { useState } from "react";

const useDetailToggle = (initialState: boolean = false) => {
  const [isShowingDetail, setIsShowingDetail] = useState(initialState);

  const toggleDetail = () => {
    setIsShowingDetail(!isShowingDetail);
  };

  return {
    isShowingDetail,
    toggleDetail,
  };
};

export default useDetailToggle;
