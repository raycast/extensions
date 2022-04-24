import actionBoundary from '../utils/actionBoundary'
import useRequire from '../hooks/useRequire'
import { ActionPanel, Icon, List, showToast, Action, Toast } from '@raycast/api'
import { changeOutboundMode, getOutboundMode } from '../api'
import { IconIsCurrent } from '../utils'
import { OutboundModeNameT } from '../utils/types'

const OutboundMode = () => {
  const { response: currentOutboundMode, setResponse: setCurrentOutboundMode } =
    useRequire<OutboundModeNameT>({
      apiLoader: getOutboundMode,
      defaultData: 'rule',
    })
  const outboundModeTitles = {
    direct: 'Direct Outbound',
    proxy: 'Global Proxy',
    rule: 'Rule-Based Proxy',
  }

  const onActionHandle = actionBoundary(async (mode: OutboundModeNameT) => {
    await changeOutboundMode({ mode })
    setCurrentOutboundMode(mode)
    await showToast(Toast.Style.Success, 'Success', `Outbound Mode changed to ${outboundModeTitles[mode]}`)
  })

  const outboundModeNameList = Object.keys(outboundModeTitles) as OutboundModeNameT[]

  return (
    <List.Item
      title="Outbound Mode"
      icon={Icon.ArrowRight}
      subtitle={outboundModeTitles[currentOutboundMode]}
      actions={
        <ActionPanel>
          <ActionPanel.Submenu title="Change Outbound Mode">
            {outboundModeNameList.map((mode) => (
              <Action
                key={mode}
                title={outboundModeTitles[mode]}
                icon={IconIsCurrent(currentOutboundMode === mode)}
                onAction={() => onActionHandle(mode)}
              />
            ))}
          </ActionPanel.Submenu>
        </ActionPanel>
      }
    />
  )
}

export default OutboundMode
