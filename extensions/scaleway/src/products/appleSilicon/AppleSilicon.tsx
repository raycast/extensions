import { DataLoaderProvider } from '@scaleway/use-dataloader'
import { Servers } from './Servers'

export const AppleSilicon = () => (
  <DataLoaderProvider>
    <Servers />
  </DataLoaderProvider>
)
