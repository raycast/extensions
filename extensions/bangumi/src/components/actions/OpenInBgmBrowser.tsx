import { Action, Keyboard } from "@raycast/api"

interface OpenInBgmBrowserProps extends Omit<React.ComponentProps<typeof Action.OpenInBrowser>, "url"> {
  url?: string
  path?: string
}

export const OpenInBgmBrowser = ({ path, url, shortcut, ...props }: OpenInBgmBrowserProps) => {
  const finalUrl = url || (path ? `https://bgm.tv/${path}` : "https://bgm.tv")
  const defaultShortcut: Keyboard.Shortcut | undefined = { modifiers: ["cmd"], key: "o" }

  return (
    <Action.OpenInBrowser url={finalUrl} shortcut={shortcut !== undefined ? shortcut : defaultShortcut} {...props} />
  )
}
