import { activeIdAtom } from './common/atoms'
import { useAtom } from "jotai";
import { closeMainWindow, launchCommand, LaunchType, popToRoot } from '@raycast/api'

export default function Command() {
  const [ACTIVEID, SetActiveId] = useAtom(activeIdAtom);
  if (ACTIVEID == '') {
    popToRoot({ clearSearchBar: true })
    closeMainWindow()
    return
  }
  SetActiveId('')
  launchCommand({
    name: "menubar",
    type: LaunchType.UserInitiated,
  })
  popToRoot({ clearSearchBar: true })
  closeMainWindow()
}
