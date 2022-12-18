import { List } from "@raycast/api";
import { ComponentProps } from "react";

export type State =
  | {
      type: "loading-state";
    }
  | {
      type: "begin";
    }
  | {
      type: "working";
      startedAt: Date;
    }
  | {
      type: "resting";
      restType: "short" | "long";
      startedAt: Date;
    };

export type RaycastIcon = ComponentProps<typeof List.Item>["icon"];
