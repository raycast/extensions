import { Detail } from "@raycast/api";
import { useModelCard } from "../hooks/useModelCard";
import { EntityType } from "../interfaces";

interface ReadmeProps {
  modelId: string;
  type: EntityType;
}

export const ModelCardDetail = ({ modelId, type }: ReadmeProps): JSX.Element => {
  const { data, isLoading } = useModelCard(modelId, type);

  return <Detail markdown={data} isLoading={isLoading} />;
};
