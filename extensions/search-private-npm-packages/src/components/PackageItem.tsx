import { Icon, List } from "@raycast/api";

type Props = {
  name: string;
  version: string;
  description: string;
};

export default function PackageItem({ name, version, description }: Props) {
  return <List.Item icon={Icon.CircleFilled} title={name} detail={`${version} ${description}`} />;
}
