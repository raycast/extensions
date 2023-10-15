import type { Container } from '@scaleway/sdk'
import { DataLoaderProvider } from '@scaleway/use-dataloader'
import { APIProvider } from '../../providers'
import { ContainerLogs as ContainerL } from './ContainerLogs'

type ContainerLogsProps = {
  container: Container.v1beta1.Container
}

export const ContainerLogs = ({ container }: ContainerLogsProps) => (
  <DataLoaderProvider>
    <APIProvider>
      <ContainerL container={container} />
    </APIProvider>
  </DataLoaderProvider>
)
