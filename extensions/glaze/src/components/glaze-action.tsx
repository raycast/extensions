import { Action } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import type { ComponentProps } from "react";

/** Surface launch failures in the UI; AI tools must still receive thrown errors. */
export function GlazeAction(props: ComponentProps<typeof Action>) {
  return (
    <Action
      {...props}
      onAction={async () => {
        try {
          await props.onAction?.();
        } catch (error) {
          await showFailureToast(error, {
            title: `Couldn't ${props.title.toLowerCase()}`,
          });
        }
      }}
    />
  );
}
