import { Optional } from "@/common/utils/optional-utils";

export interface Calendar {
  id: string;
  name: Optional<string>;
  isDefault: boolean;
}
