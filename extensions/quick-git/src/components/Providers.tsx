import { PropsWithChildren } from "react";
import { CheckStatusContext } from "../hooks/useCheckStatus.js";
import { RepoContext } from "../hooks/useRepo.js";

interface Props {
  repo?: string;
  checkStatus: () => void;
}

export function Providers({ repo, checkStatus, children }: PropsWithChildren<Props>) {
  return (
    <RepoContext value={repo ?? ""}>
      <CheckStatusContext value={checkStatus}>{children}</CheckStatusContext>
    </RepoContext>
  );
}
