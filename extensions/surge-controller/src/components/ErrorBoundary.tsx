import { Icon, List } from '@raycast/api'

type Props = {
  error: unknown
  icon?: Icon
  title?: string
  info?: string
  actions?: React.ReactNode
  errorCallback?: () => void
}

const ErrorBoundary: React.FC<Props> = ({
  error,
  icon = Icon.XmarkCircle,
  title = 'Request Fail',
  info = `Please check your Surge status and Backends setting`,
  actions,
  children,
}) => (
  <>{error ? <List.EmptyView icon={icon} title={title} description={info} actions={actions} /> : children}</>
)

export default ErrorBoundary
