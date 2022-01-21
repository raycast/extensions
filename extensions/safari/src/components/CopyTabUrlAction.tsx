import { CopyToClipboardAction } from "@raycast/api";

import { Tab } from "../types";

const CopyTabUrlAction = (props: { tab: Tab }) => <CopyToClipboardAction content={props.tab.url} title="Copy URL" />;

export default CopyTabUrlAction;
