import type { BlockKind, BlockState } from "./cli-output";

export type BlockPrimaryAction = "start" | "stop" | "refresh";
export type BlockSecondaryAction = "start-options" | "diagnostics";

export interface BlockMenuPolicy {
  primaryAction: BlockPrimaryAction;
  secondaryAction?: BlockSecondaryAction;
  showWebsiteEditing: boolean;
  showBreakControls: boolean;
}

export function getBlockMenuPolicy(block: { state: BlockState; kind: BlockKind }): BlockMenuPolicy {
  const isWebsiteBlock = block.kind === "website-app";

  if (block.state === "enabled") {
    return {
      primaryAction: "stop",
      showWebsiteEditing: isWebsiteBlock,
      showBreakControls: isWebsiteBlock,
    };
  }

  if (block.state === "disabled") {
    return {
      primaryAction: "start",
      secondaryAction: "start-options",
      showWebsiteEditing: isWebsiteBlock,
      showBreakControls: false,
    };
  }

  return {
    primaryAction: "refresh",
    secondaryAction: "diagnostics",
    showWebsiteEditing: false,
    showBreakControls: false,
  };
}
