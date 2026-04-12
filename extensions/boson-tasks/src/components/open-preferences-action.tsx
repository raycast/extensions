import { Action, Icon, useNavigation } from '@raycast/api'
import ConfigurationForm from '@/features/configuration-form/configuration-form'

export function OpenPreferencesAction({
  revalidate,
}: {
  revalidate?: () => void
}) {
  const { push } = useNavigation()
  return (
    <Action
      icon={Icon.Gear}
      title={'Open Database Settings'}
      onAction={() =>
        push(<ConfigurationForm revalidate={revalidate} navigation={true} />)
      }
      shortcut={{ modifiers: ['cmd', 'shift'], key: ',' }}
    />
  )
}
