import { QueryWrapper } from "./providers/QueryProvider";
import { AssetsList } from "./components/AssetsList";

export default function NftsList() {
  return (
    <QueryWrapper>
      <AssetsList searchBarPlaceholder="Search all your assets..." />
    </QueryWrapper>
  );
}
