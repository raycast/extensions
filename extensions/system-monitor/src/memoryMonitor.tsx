import { List } from "@raycast/api";
import { freemem, freememPercentage } from "os-utils";
import { useEffect, useState } from "react";

export default function MemoryMonitor() {
  const [freeMemPercentage, setFreeMemPercentage] = useState("0");
  const [freeMem, setFreeMem] = useState("0");

  useEffect(() => {
    let monitorInterval = setInterval(() => {
      setFreeMemPercentage(Math.round(freememPercentage() * 100).toString());
      setFreeMem(Math.round(freemem() / 1024).toString());
    }, 1000);
    return () => {
      clearInterval(monitorInterval);
    };
  }, []);

  return (
    <>
      <List.Item
        title={`📝 Free Memory: `}
        subtitle={`${freeMemPercentage}% (~ ${freeMem} GB)`}
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Free Memory %: " text={freeMemPercentage + " %"} />
                <List.Item.Detail.Metadata.Label title="Free Memory : " text={freeMem + " GB"} />
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
    </>
  );
}
