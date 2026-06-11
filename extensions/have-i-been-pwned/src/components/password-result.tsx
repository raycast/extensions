import { Detail } from "@raycast/api";
import { passwordMarkdown } from "../utils/markdown";
import { HibpActions } from "./hibp-actions";

interface PasswordResultProps {
  count: number | null;
  isLoading: boolean;
}

export const PasswordResult = ({ count, isLoading }: PasswordResultProps) => (
  <Detail
    markdown={!isLoading && count !== null ? passwordMarkdown(count) : ""}
    isLoading={isLoading}
    actions={<HibpActions />}
  />
);
