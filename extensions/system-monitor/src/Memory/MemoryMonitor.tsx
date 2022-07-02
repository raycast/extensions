import { List } from "@raycast/api";
import { freemem, freememPercentage } from "os-utils";
import { useEffect, useState } from "react";
import { getTopRamProcess } from "./MemoryUtils";

export default function MemoryMonitor() {
  const [state, setState] = useState({
    freeMem: "Checking...",
    freeMemPercentage: "Checking...",
    topProcess: [],
  });

  useEffect(() => {
    let monitorInterval = setInterval(async () => {
      const newTopProcess = await getTopRamProcess();
      setState((prevState) => {
        return {
          ...prevState,
          freeMemPercentage: Math.round(freememPercentage() * 100).toString(),
          freeMem: Math.round(freemem() / 1024).toString(),
          topProcess: newTopProcess,
        };
      });
    }, 1000);
    return () => {
      clearInterval(monitorInterval);
    };
  }, []);

  return (
    <>
      <List.Item
        title={`📝 Memory: `}
        subtitle={`${state.freeMemPercentage}% (~ ${state.freeMem} GB)`}
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Free RAM %: " text={state.freeMemPercentage + " %"} />
                <List.Item.Detail.Metadata.Label title="Free RAM : " text={state.freeMem + " GB"} />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Process Name" text="RAM" />
                {state.topProcess !== [] &&
                  state.topProcess.map((element, index) => {
                    return (
                      <List.Item.Detail.Metadata.Label key={index} title={"  -  " + element[0]} text={element[1]} />
                    );
                  })}
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
    </>
  );
}
