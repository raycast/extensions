import { Icon, List } from '@raycast/api'

import Actions from '@/components/Actions'
import { ChatMessage } from '@/types'

type MessageProps = {
  index: number
  message: ChatMessage
}

export default function Message({ index, message }: MessageProps) {
  function getName(role: ChatMessage['role']) {
    if (role === 'user') {
      return 'You'
    } else if (role === 'assistant') {
      return 'ChatGPT'
    } else if (role === 'system') {
      return 'System'
    } else {
      return ''
    }
  }

  function getListIcon(role: ChatMessage['role']) {
    if (role === 'user') {
      return Icon.Person
    } else if (role === 'assistant') {
      return Icon.Keyboard
    } else if (role === 'system') {
      return Icon.Cog
    } else {
      return Icon.Circle
    }
  }

  return (
    <List.Item
      id={`message-${index}`}
      title={getName(message.role)}
      icon={getListIcon(message.role)}
      subtitle={message.content}
      detail={<List.Item.Detail markdown={message.content} />}
      actions={<Actions type="message" content={message.content} />}
    />
  )
}
