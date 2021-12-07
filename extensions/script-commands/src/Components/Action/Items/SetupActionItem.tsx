import { 
  OpenAction 
} from "@raycast/api"

import { 
  IconConstants 
} from "@constants"

type Props = {
  path: string
  onSetup: () => void
}

export function SetupActionItem({ path, onSetup }: Props): JSX.Element {
  return (
    <OpenAction 
      icon={ IconConstants.Setup } 
      title="Configure Script Command" 
      target={ path }
      onOpen={ onSetup }
    />
  )
}