import { PropsWithChildren } from "react";
import { CheckStatusContext } from "../hooks/useGitStatus.js";
import { RepoContext, SelectedRepo } from "../hooks/useRepo.js";

interface Props {
  repo: SelectedRepo;
  checkStatus: () => void;
}

export function Providers({ repo, checkStatus, children }: PropsWithChildren<Props>) {
  return (
    <RepoContext value={repo}>
      <CheckStatusContext value={checkStatus}>{children}</CheckStatusContext>
    </RepoContext>
  );
}
