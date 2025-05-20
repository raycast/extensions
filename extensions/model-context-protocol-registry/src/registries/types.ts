import { List, Image } from "@raycast/api";

export type RegistryProps = Pick<List.Props, "searchText"> & {
  isShowingDetail: boolean;
  setShowingDetail: (isShowingDetail: boolean) => void;
  pagination: List.Props["pagination"];
  setPagination?: (pagination: List.Props["pagination"]) => void;
  isLoading: List.Props["isLoading"];
  setIsLoading?: (isLoading: boolean) => void;
};

export type Registry = {
  id: string;
  title: string;
  icon: Image.ImageLike;
  component: React.FC<RegistryProps>;
  throttle?: List.Props["throttle"];
};
