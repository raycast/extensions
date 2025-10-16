import { List } from "@raycast/api";
import { WebVersion } from "../interface";

interface Props {
  data?: WebVersion;
}

const ProtonVersionList = ({ data }: Props) => {
  if (!data) return null;
  return <List.Item title="temp" />;
};

export default ProtonVersionList;
