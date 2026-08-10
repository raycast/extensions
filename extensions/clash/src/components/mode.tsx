import { Action, ActionPanel, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { GetConfigs, PatchConfigs } from "./client/http";
import { ModeT } from "./types";
import { upperFirst } from "../utils";
import { ErrorHandler } from "../utils/error";

const modes: Array<ModeT> = ["rule", "global", "direct", "script"];

export default function Mode(): JSX.Element {
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState("" as ModeT);
  const [refresh, setRefresh] = useState(false);
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await GetConfigs();
        setCurrent(data.mode);
      } catch (e) {
        ErrorHandler(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [refresh]);

  return (
    <List isLoading={loading}>
      {modes.map((mode, index) => (
        <List.Item
          key={index}
          title={upperFirst(mode)}
          accessoryTitle={mode == current ? "Current" : ""}
          actions={
            <ActionPanel>
              <Action
                title="Select"
                onAction={async () => {
                  try {
                    setLoading(true);
                    await PatchConfigs({ mode });
                    setRefresh(!refresh);
                  } catch (e) {
                    ErrorHandler(e);
                  } finally {
                    setLoading(false);
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
