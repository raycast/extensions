interface Preferences {
  openIn: "web" | "desktop-app";
  hideCodeBlocksInSearch: boolean;
  quickCaptureTemplate: string;
  quickCaptureTagTodayDnp: boolean;
}

type BlockParentPull = {
  ":block/uid": string;
  ":block/string": string;
  ":node/title": string;
  ":block/_children": BlockParentPull;
};

// query used for this most of the time is `./roamApi/BLOCK_QUERY`
type ReversePullBlock = any & {
  ":block/uid": string;
  ":block/_children": BlockParentPull[];
  ":block/_refs": { ":db/id": number }[];
  ":block/refs": { ":block/uid": string; ":block/string": string; ":node/title": string }[];
};

type GraphConfig = { nameField: string; tokenField: string };

type GraphsConfigMap = Record<string, GraphConfig>;
