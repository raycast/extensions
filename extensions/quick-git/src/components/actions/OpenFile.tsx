import { PropsWithChildren, useEffect, useMemo, useState } from "react";
import { join } from "node:path";
import { Action, getDefaultApplication, Icon, Image, Keyboard } from "@raycast/api";
import { useRepo } from "../../hooks/useRepo.js";

interface Props {
  fileName: string;
}

export function OpenFile({ fileName }: PropsWithChildren<Props>) {
  const [appIcon, setAppIcon] = useState<Image.ImageLike>();
  const { value } = useRepo();
  const filePath = useMemo(() => join(value ?? "", fileName), [fileName, value]);

  useEffect(() => {
    if (!value) return;
    getDefaultApplication(filePath)
      .then((app) => {
        setAppIcon({ fileIcon: app.path });
      })
      .catch();
  }, [filePath, value]);

  return (
    <>
      {appIcon ? (
        <Action.Open title="Open File" icon={appIcon} target={filePath} shortcut={Keyboard.Shortcut.Common.Open} />
      ) : null}
      <Action.OpenWith
        title="Open File"
        icon={Icon.Finder}
        path={filePath}
        shortcut={Keyboard.Shortcut.Common.OpenWith}
      />
    </>
  );
}
