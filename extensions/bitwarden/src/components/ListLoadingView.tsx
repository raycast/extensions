import { Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";

const ProgressIcons = [Icon.CircleProgress25, Icon.CircleProgress50, Icon.CircleProgress75, Icon.CircleProgress100];

export type ListLoadingViewProps = Omit<List.EmptyView.Props, "icon">;

export const ListLoadingView = (props: ListLoadingViewProps) => {
  const [progressIconIndex, setProgressIconIndex] = useState(0);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const progress = () => {
      timeout = setTimeout(() => {
        clearTimeout(timeout);
        setProgressIconIndex((prev) => ++prev % ProgressIcons.length);

        progress();
      }, 500);
    };

    progress();
    return () => clearTimeout(timeout);
  }, []);

  return <List.EmptyView icon={ProgressIcons[progressIconIndex]} {...props} />;
};
