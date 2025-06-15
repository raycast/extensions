import { PropsWithChildren, useEffect, useMemo, useState } from "react";
import { join } from "node:path";
import { Action, getDefaultApplication, Icon, Image, Keyboard } from "@raycast/api";
import { useRepo } from "../../hooks/useRepo.js";

interface Props {
  fileName: string;
}

export function OpenFile({ fileName }: PropsWithChildren<Props>) {
  const [appIcon, setAppIcon] = useState<Image.ImageLike>();
  const repo = useRepo();
  const filePath = useMemo(() => join(repo ?? "", fileName), [fileName, repo]);

  useEffect(() => {
    getDefaultApplication(filePath)
      .then((app) => {
        setAppIcon({ fileIcon: app.path });
      })
      .catch(() => {
        // Quietly catch any error and fallback to the default image
      });
  }, [filePath, repo]);

  return (
    <>
      <Action.Open title="Open File" icon={appIcon} target={filePath} shortcut={Keyboard.Shortcut.Common.Open} />
      <Action.OpenWith
        title="Open File"
        icon={Icon.Finder}
        path={filePath}
        shortcut={Keyboard.Shortcut.Common.OpenWith}
      />
    </>
  );
}
