import { useCallback, useState } from "react";
import { MintCLIResolution, resolveMintCLI } from "./mint-cli";

export function useMintCLI(): { resolution: MintCLIResolution; recheck: () => MintCLIResolution } {
  const [resolution, setResolution] = useState<MintCLIResolution>(() => resolveMintCLI());
  const recheck = useCallback(() => {
    const nextResolution = resolveMintCLI();
    setResolution(nextResolution);
    return nextResolution;
  }, []);
  return { resolution, recheck };
}
