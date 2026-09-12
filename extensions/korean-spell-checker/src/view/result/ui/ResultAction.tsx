import { Action, Clipboard, Icon, Toast, open, showHUD, showToast } from "@raycast/api";

import { UserActions, ActionType } from "@type";
import { ResultManager } from "@view/result";

interface ResultActionProps {
  title: string;
  actionType: ActionType;
  resultManager: ResultManager;
  url?: string;
}

export default function ResultAction({ title, actionType, resultManager, url }: ResultActionProps) {
  const userActions: UserActions = {
    COPY: async (content: string) => {
      await Clipboard.copy(content);
      await showHUD("Text copied!");
    },
    TWITTER: async (url: string) => {
      await open(url);
      await showHUD("Opening in Browser...");
    },
  };

  async function action(actionType: ActionType, url?: string) {
    const content = resultManager.buildResult();
    try {
      if (url) {
        await userActions[actionType](`https://twitter.com/intent/tweet?text=${encodeURIComponent(content)}`);
      } else {
        await userActions[actionType](content);
      }
    } catch (_error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: "Please report this issue to raycast",
      });
    }
  }

  if (actionType === "TWITTER" && url) {
    return (
      <Action
        icon="twitter.png"
        title={title}
        onAction={async () => action("TWITTER", url)}
        shortcut={{ modifiers: ["ctrl"], key: "t" }}
      />
    );
  }

  return (
    <Action
      icon={Icon.Clipboard}
      title={title}
      onAction={async () => action("COPY")}
      shortcut={{ modifiers: ["ctrl"], key: "c" }}
    />
  );
}
