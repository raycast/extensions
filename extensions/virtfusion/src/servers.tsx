import { useCachedPromise } from "@raycast/utils";
import { Panel } from "./types";
import VirtFusion from "./virtfusion";

export default function Servers({panel}: {panel: Panel}) {
    const vf = new VirtFusion(panel);
  const {isLoading} = useCachedPromise(async() => {
    
  })
}
